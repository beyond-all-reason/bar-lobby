import axios from "axios";
import * as fs from "fs";
import { glob } from "glob";
import { BufferStream, removeFromArray } from "jaz-ts-utils";
import { Minimatch } from "minimatch";
import * as path from "path";
import util from "util";
import zlib from "zlib";

import { PrDownloaderAPI } from "@/api/content/pr-downloader";
import { contentSources } from "@/config/content-sources";
import { defaultGameVersion } from "@/config/default-versions";
import { CustomGameVersion, GameAI, GameVersion } from "@/model/cache/game-version";
import { DownloadInfo } from "@/model/downloads";
import { LuaOptionSection } from "@/model/lua-options";
import { Scenario } from "@/model/scenario";
import { SdpFile, SdpFileMeta } from "@/model/sdp";
import { parseLuaOptions } from "@/utils/parse-lua-options";
import { parseLuaTable } from "@/utils/parse-lua-table";

const gunzip = util.promisify(zlib.gunzip);

export class GameContentAPI extends PrDownloaderAPI<GameVersion | CustomGameVersion> {
    public override async init() {
        const gameVersions = await api.cacheDb.selectFrom("gameVersion").selectAll().execute();

        for (const version of gameVersions) {
            this.installedVersions.push(version);
        }

        // load custom .sdd games
        const gamesDir = path.join(api.info.contentPath, "games");
        if (fs.existsSync(gamesDir)) {
            const dirs = await fs.promises.readdir(gamesDir);
            for (const dir of dirs) {
                try {
                    const modInfoLua = await fs.promises.readFile(path.join(gamesDir, dir, "modinfo.lua"));
                    const modInfo = parseLuaTable(modInfoLua);

                    const aiInfoLua = await fs.promises.readFile(path.join(gamesDir, dir, "luaai.lua"));
                    const ais = await this.parseAis(aiInfoLua);

                    this.installedVersions.push({
                        id: `${modInfo.game} ${modInfo.version}`,
                        dir,
                        ais,
                    });
                } catch (err) {
                    console.error(err);
                }
            }
        }

        this.sortVersions();

        return this;
    }

    public override isVersionInstalled(version: string) {
        return this.installedVersions.some((installedVersion) => installedVersion.id === version);
    }

    /**
     * Downloads the actual game files, will update to latest if no specific gameVersion is specified
     * @param gameVersion e.g. "Beyond All Reason test-16289-b154c3d"
     */
    public async downloadGame(gameVersion = `${contentSources.rapid.game}:test`) {
        // skip download if already installed
        if (this.isVersionInstalled(gameVersion)) {
            return;
        }

        return this.downloadContent("game", gameVersion);
    }

    public async getGameOptions(version: string): Promise<LuaOptionSection[]> {
        const gameVersion = this.installedVersions.find((version) => version.id === defaultGameVersion)!;
        // TODO: cache per session
        const gameFiles = await this.getGameFiles(gameVersion, "modoptions.lua", true);
        const gameOptionsLua = gameFiles[0].data;
        return parseLuaOptions(gameOptionsLua);
    }

    public async getScenarios(): Promise<Scenario[]> {
        const gameVersion = this.installedVersions.find((version) => version.id === defaultGameVersion)!;

        const scenarioImages = await this.getGameFiles(gameVersion, "singleplayer/scenarios/**/*.{jpg,png}", false);
        const scenarioDefinitions = await this.getGameFiles(gameVersion, "singleplayer/scenarios/**/*.lua", true);

        const cacheDir = path.join(api.info.contentPath, "scenario-images");
        await fs.promises.mkdir(cacheDir, { recursive: true });

        for (const scenarioImage of scenarioImages) {
            const data = await fs.promises.readFile(scenarioImage.archivePath);
            const buffer = await gunzip(data);
            const fileName = path.parse(scenarioImage.fileName).base;
            await fs.promises.writeFile(path.join(cacheDir, fileName), buffer);
        }

        const scenarios: Scenario[] = [];

        for (const scenarioDefinition of scenarioDefinitions) {
            try {
                const scenario = parseLuaTable(scenarioDefinition.data) as Scenario;
                scenario.imagepath = path.join(cacheDir, scenario.imagepath).replaceAll("\\", "/");
                scenario.summary = scenario.summary.replace(/\[|\]/g, "");
                scenario.briefing = scenario.briefing.replace(/\[|\]/g, "");
                scenario.allowedsides = Array.isArray(scenario.allowedsides) && scenario.allowedsides[0] !== "" ? scenario.allowedsides : ["Armada", "Cortext", "Random"];
                scenario.startscript = scenario.startscript.slice(1, -1);
                scenarios.push(scenario);
            } catch (err) {
                console.error(`error parsing scenario lua file: ${scenarioDefinition.fileName}`, err);
            }
        }

        scenarios.sort((a, b) => a.index - b.index);

        return scenarios;
    }

    /**
     * @param filePatterns glob pattern for which files to retrieve
     * @example getGameFiles("Beyond All Reason test-16289-b154c3d", ["units/CorAircraft/T2/*.lua"])
     * @todo make this work for custom .sdd versions
     */
    public async getGameFiles(version: { md5: string } | { dir: string }, filePattern: string, parseData?: false): Promise<SdpFileMeta[]>;
    public async getGameFiles(version: { md5: string } | { dir: string }, filePattern: string, parseData?: true): Promise<SdpFile[]>;
    public async getGameFiles(version: { md5: string } | { dir: string }, filePattern: string, parseData = false): Promise<SdpFileMeta[] | SdpFile[]> {
        if ("dir" in version) {
            const sdpFiles: Array<SdpFileMeta & { data?: Buffer }> = [];
            const customGameDir = path.join(api.info.contentPath, "games", version.dir);
            const files = await glob(path.join(customGameDir, filePattern), { windowsPathsNoEscape: true });

            for (const file of files) {
                const sdpData = {
                    archivePath: file,
                    fileName: path.parse(file).base,
                    crc32: "",
                    md5: "",
                    filesizeBytes: 0,
                };
                if (parseData) {
                    const data = await fs.promises.readFile(file);
                    sdpFiles.push({ ...sdpData, data });
                } else {
                    sdpFiles.push(sdpData);
                }
            }

            return sdpFiles;
        }

        const md5 = version.md5;
        const sdpFileName = `${md5}.sdp`;
        const filePath = path.join(api.info.contentPath, "packages", sdpFileName);
        const sdpEntries = await this.parseSdpFile(filePath, filePattern);
        const sdpFiles: Array<SdpFileMeta & { data?: Buffer }> = [];

        for (const sdpEntry of sdpEntries) {
            const poolDir = sdpEntry.md5.slice(0, 2);
            const archiveFileName = `${sdpEntry.md5.slice(2)}.gz`;
            const archiveFilePath = path.join(api.info.contentPath, "pool", poolDir, archiveFileName);
            const archiveFile = await fs.promises.readFile(archiveFilePath);

            if (parseData) {
                const data = await gunzip(archiveFile);
                sdpFiles.push({ ...sdpEntry, data });
            } else {
                sdpFiles.push(sdpEntry);
            }
        }

        return sdpFiles;
    }

    public async uninstallVersion(version: GameVersion) {
        // TODO: Uninstall game version through prd when prd supports it

        await this.uncacheVersion(version);

        removeFromArray(this.installedVersions, version);
    }

    protected async uncacheVersion(version: GameVersion) {
        await api.cacheDb.deleteFrom("gameVersion").where("id", "=", version.id).execute();
    }

    protected async parseSdpFile(sdpFilePath: string, filePattern?: string): Promise<SdpFileMeta[]> {
        const sdpFileZipped = await fs.promises.readFile(sdpFilePath);
        const sdpFile = zlib.gunzipSync(sdpFileZipped);

        const bufferStream = new BufferStream(sdpFile, true);

        const fileData: SdpFileMeta[] = [];

        let globPattern: Minimatch | undefined;
        if (filePattern) {
            globPattern = new Minimatch(filePattern); //new glob.Glob(filePattern);
        }

        while (bufferStream.readStream.readableLength > 0) {
            const fileNameLength = bufferStream.readInt(1);
            const fileName = bufferStream.readString(fileNameLength);
            const md5 = bufferStream.read(16).toString("hex");
            const crc32 = bufferStream.read(4).toString("hex");
            const filesizeBytes = bufferStream.readInt(4, true);
            const archivePath = path.join(api.info.contentPath, "pool", md5.slice(0, 2), `${md5.slice(2)}.gz`);

            if (globPattern && globPattern.match(fileName)) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
            } else if (!globPattern) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
            }
        }

        return fileData;
    }

    // TODO: make this check from local file system
    protected async getMd5(targetVersion: string): Promise<string> {
        const response = await axios({
            url: `${contentSources.rapid.host}/${contentSources.rapid.game}/versions.gz`,
            method: "GET",
            responseType: "arraybuffer",
            headers: {
                "Content-Type": "application/gzip",
            },
        });

        const versionsStr = zlib.gunzipSync(response.data).toString().trim();
        const versionsParts = versionsStr.split("\n");
        for (const versionLine of versionsParts) {
            const [, md5, , version] = versionLine.split(",");
            if (version === targetVersion) {
                return md5;
            }
        }

        throw new Error(`Couldn't parse md5 for game version : ${targetVersion}`);
    }

    protected sortVersions() {
        this.installedVersions.sort((a, b) => {
            try {
                const aRev = parseInt(a.id.split("-")[1]);
                const bRev = parseInt(b.id.split("-")[1]);
                return aRev - bRev;
            } catch (err) {
                return 1;
            }
        });
    }

    protected override async downloadComplete(downloadInfo: DownloadInfo) {
        await this.addGame(downloadInfo.name);

        super.downloadComplete(downloadInfo);
    }

    protected async addGame(id: string, sort = true) {
        if (this.isVersionInstalled(id) || id === "byar:test") {
            return;
        }

        const md5 = await this.getMd5(id);
        const luaAiFile = (await this.getGameFiles({ md5 }, "luaai.lua", true))[0];
        const ais = await this.parseAis(luaAiFile.data);

        const gameVersion = await api.cacheDb.insertInto("gameVersion").values({ id, md5, ais, lastLaunched: new Date() }).returningAll().executeTakeFirstOrThrow();

        this.installedVersions.push(gameVersion);

        if (sort) {
            this.sortVersions();
        }
    }

    protected async parseAis(aiInfo: Buffer): Promise<GameAI[]> {
        const ais: GameAI[] = [];

        const aiDefinitions = parseLuaTable(aiInfo);
        for (const def of aiDefinitions) {
            ais.push({
                name: def.name,
                description: def.desc,
            });
        }

        return ais;
    }

    protected async cleanupOldVersions() {
        const maxDays = 90;

        const oldestDate = new Date();
        oldestDate.setDate(oldestDate.getDate() - maxDays);

        const versionsToRemove = await api.cacheDb.selectFrom("gameVersion").where("lastLaunched", "<", oldestDate).select("id").execute();

        for (const version of versionsToRemove) {
            // TODO: needs https://github.com/beyond-all-reason/pr-downloader/issues/21
            // await this.uninstallVersion(version.id);
        }
    }
}
