import axios from "axios";
import * as fs from "fs";
import * as glob from "glob-promise";
import { BufferStream, entries } from "jaz-ts-utils";
import * as path from "path";
import util from "util";
import { reactive } from "vue";
import zlib from "zlib";

import { PrDownloaderAPI } from "@/api/content/pr-downloader";
import { contentSources } from "@/config/content-sources";
import { defaultGameVersion } from "@/config/default-versions";
import { LuaOptionSection } from "@/model/lua-options";
import { Scenario } from "@/model/scenario";
import { SdpFile, SdpFileMeta } from "@/model/sdp";
import { parseLuaOptions } from "@/utils/parse-lua-options";
import { parseLuaTable } from "@/utils/parse-lua-table";

const gunzip = util.promisify(zlib.gunzip);

/**
 * This API utilises pr-downloader to download game files, therefore it requires at least one engine version to be installed and for api.content.engine to be initialised
 * prd is quite a dated tool at this point, and is lacking a lot of desired functionality that
 * would simplify this wrapper a lot
 *
 * https://github.com/beyond-all-reason/pr-downloader
 * https://springrts.com/wiki/Pr-downloader
 * https://springrts.com/wiki/Rapid
 *
 * @todo installedVersions is primitive and prone to bugs, as it only checks the packages folder and matches each sdp file
 * against the version listed in versions.gz. We don't verify if an sdp installation is incomplete or corrupted, so bugs may arise
 * when reporting a game version as installed when it's not really. Ideally needs solving within prd
 * @todo don't allow spawning multiple prd instances at once
 */
export class GameContentAPI extends PrDownloaderAPI {
    public readonly installedVersions: Set<string> = reactive(new Set());

    protected md5ToRapidVersionMap: Record<string, string> = {};

    constructor() {
        super();

        this.onDownloadComplete.add((downloadInfo) => {
            if (!this.installedVersions.has(downloadInfo.name) && downloadInfo.name !== "byar:test") {
                this.installedVersions.add(downloadInfo.name);
                this.sortVersions();
            }
        });
    }

    public override async init() {
        await this.updateVersions();

        return this;
    }

    /**
     * Downloads the actual game files, will update to latest if no specific gameVersion is specified
     * @param gameVersion e.g. "Beyond All Reason test-16289-b154c3d"
     */
    public async downloadGame(gameVersion = `${contentSources.rapid.game}:test`) {
        return this.downloadContent("game", gameVersion);
    }

    public async updateVersions() {
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
        versionsParts.map((versionLine) => {
            const [, md5, , version] = versionLine.split(",");
            this.md5ToRapidVersionMap[md5] = version;
        });

        const packagesDir = path.join(api.info.contentPath, "packages");
        if (fs.existsSync(packagesDir)) {
            const sdpFilePaths = await fs.promises.readdir(packagesDir);
            for (const sdpPath of sdpFilePaths) {
                const sdpMd5 = path.parse(sdpPath).name;
                const version = this.md5ToRapidVersionMap[sdpMd5];
                if (!this.installedVersions.has(version) && version !== "byar:test") {
                    this.installedVersions.add(version);
                }
            }

            this.sortVersions();
        }
    }

    /**
     * @todo need to lookup sdp file for specified game
     * @param filePatterns glob pattern for which files to retrieve
     * @example getGameFiles("Beyond All Reason test-16289-b154c3d", ["units/CorAircraft/T2/*.lua"])
     */
    public async getGameFiles(version: string, filePattern: string, parseData?: false): Promise<SdpFileMeta[]>;
    public async getGameFiles(version: string, filePattern: string, parseData?: true): Promise<SdpFile[]>;
    public async getGameFiles(version: string, filePattern: string, parseData = false): Promise<SdpFileMeta[] | SdpFile[]> {
        if (!this.installedVersions.has(version)) {
            throw new Error(`Cannot fetch files for ${version}, as it is not installed`);
        }

        // TODO: lookup correct filePath
        let sdpFile = "";
        entries(this.md5ToRapidVersionMap).forEach(([md5, gameVersion]) => {
            if (gameVersion === version) {
                sdpFile = `${md5}.sdp`;
                return;
            }
        });

        if (!sdpFile) {
            throw new Error(`Couldn't find .sdp package file for game version: ${version}`);
        }

        const filePath = path.join(api.info.contentPath, "packages", sdpFile);

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

    protected sortVersions() {
        const sortedVersions = Array.from(this.installedVersions).sort((a, b) => {
            const aRev = parseInt(a.split("-")[1]);
            const bRev = parseInt(b.split("-")[1]);
            return aRev - bRev;
        });

        this.installedVersions.clear();

        for (const version of sortedVersions) {
            this.installedVersions.add(version);
        }
    }
}
