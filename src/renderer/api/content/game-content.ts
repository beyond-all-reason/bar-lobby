import axios from "axios";
import * as fs from "fs";
import * as glob from "glob-promise";
import { BufferStream } from "jaz-ts-utils";
import * as path from "path";
import util from "util";
import { reactive } from "vue";
import zlib from "zlib";

import { PrDownloaderAPI } from "@/api/content/pr-downloader";
import { contentSources } from "@/config/content-sources";
import { defaultGameVersion } from "@/config/default-versions";
import { DownloadInfo } from "@/model/downloads";
import { LuaOptionSection } from "@/model/lua-options";
import { Scenario } from "@/model/scenario";
import { SdpFile, SdpFileMeta } from "@/model/sdp";
import { parseLuaOptions } from "@/utils/parse-lua-options";
import { parseLuaTable } from "@/utils/parse-lua-table";

const gunzip = util.promisify(zlib.gunzip);

export class GameContentAPI extends PrDownloaderAPI {
    public readonly installedVersions: string[] = reactive([]);

    public override async init() {
        const gameVersions = await api.cacheDb.selectFrom("gameVersion").selectAll().execute();

        for (const version of gameVersions) {
            this.installedVersions.push(version.id);
        }

        // load custom .sdd games
        const gamesDir = path.join(api.info.contentPath, "games");
        if (fs.existsSync(gamesDir)) {
            const dirs = await fs.promises.readdir(gamesDir);
            for (const dir of dirs) {
                try {
                    const modInfoLua = await fs.promises.readFile(path.join(gamesDir, dir, "modinfo.lua"));
                    const modInfo = parseLuaTable(modInfoLua);
                    this.installedVersions.push(`${modInfo.game} ${modInfo.version}`);
                } catch (err) {
                    console.error(err);
                }
            }
        }

        this.sortVersions();

        return this;
    }

    /**
     * Downloads the actual game files, will update to latest if no specific gameVersion is specified
     * @param gameVersion e.g. "Beyond All Reason test-16289-b154c3d"
     */
    public async downloadGame(gameVersion = `${contentSources.rapid.game}:test`) {
        // skip download if already installed
        if (this.installedVersions.includes(gameVersion)) {
            return;
        }

        return this.downloadContent("game", gameVersion);
    }

    /**
     * @todo need to lookup sdp file for specified game
     * @param filePatterns glob pattern for which files to retrieve
     * @example getGameFiles("Beyond All Reason test-16289-b154c3d", ["units/CorAircraft/T2/*.lua"])
     */
    public async getGameFiles(version: string, filePattern: string, parseData?: false): Promise<SdpFileMeta[]>;
    public async getGameFiles(version: string, filePattern: string, parseData?: true): Promise<SdpFile[]>;
    public async getGameFiles(version: string, filePattern: string, parseData = false): Promise<SdpFileMeta[] | SdpFile[]> {
        if (!this.installedVersions.includes(version)) {
            throw new Error(`Cannot fetch files for ${version}, as it is not installed`);
        }

        const md5 = await this.getMd5(version);
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

    public async getGameOptions(version: string): Promise<LuaOptionSection[]> {
        // TODO: cache per session
        const gameFiles = await this.getGameFiles(version, "modoptions.lua", true);
        const gameOptionsLua = gameFiles[0].data;
        return parseLuaOptions(gameOptionsLua);
    }

    public async getScenarios(): Promise<Scenario[]> {
        const scenarioImages = await this.getGameFiles(defaultGameVersion, "singleplayer/scenarios/**/*.{jpg,png}", false);
        const scenarioDefinitions = await this.getGameFiles(defaultGameVersion, "singleplayer/scenarios/**/*.lua", true);

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

    protected async parseSdpFile(sdpFilePath: string, filePattern?: string): Promise<SdpFileMeta[]> {
        const sdpFileZipped = await fs.promises.readFile(sdpFilePath);
        const sdpFile = zlib.gunzipSync(sdpFileZipped);

        const bufferStream = new BufferStream(sdpFile, true);

        const fileData: SdpFileMeta[] = [];

        let globPattern: InstanceType<typeof glob.Glob> | undefined;
        if (filePattern) {
            globPattern = new glob.Glob(filePattern);
        }

        while (bufferStream.readStream.readableLength > 0) {
            const fileNameLength = bufferStream.readInt(1);
            const fileName = bufferStream.readString(fileNameLength);
            const md5 = bufferStream.read(16).toString("hex");
            const crc32 = bufferStream.read(4).toString("hex");
            const filesizeBytes = bufferStream.readInt(4, true);
            const archivePath = path.join(api.info.contentPath, "pool", md5.slice(0, 2), `${md5.slice(2)}.gz`);

            if (globPattern && globPattern.minimatch.match(fileName)) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
            } else if (!globPattern) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
            }
        }

        return fileData;
    }

    // TODO: make this check from local file system
    protected async getMd5(targetVersion: string) {
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

        return null;
    }

    protected sortVersions() {
        this.installedVersions.sort((a, b) => {
            try {
                const aRev = parseInt(a.split("-")[1]);
                const bRev = parseInt(b.split("-")[1]);
                return aRev - bRev;
            } catch (err) {
                return 1;
            }
        });
    }

    protected override async downloadComplete(downloadInfo: DownloadInfo) {
        super.downloadComplete(downloadInfo);

        if (!this.installedVersions.includes(downloadInfo.name) && downloadInfo.name !== "byar:test") {
            this.installedVersions.push(downloadInfo.name);

            this.sortVersions();

            const md5 = await this.getMd5(downloadInfo.name);

            await api.cacheDb
                .insertInto("gameVersion")
                .onConflict((oc) => oc.doNothing())
                .values({
                    id: downloadInfo.name,
                    md5: md5 ?? "",
                })
                .execute();
        }
    }
}
