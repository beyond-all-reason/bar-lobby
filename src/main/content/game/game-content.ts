// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as glob from "glob-promise";
import { removeFromArray } from "$/jaz-ts-utils/object";
import * as path from "path";
import util, { promisify } from "util";
import zlib from "zlib";
import { GameAI, GameVersion } from "@main/content/game/game-version";
import { parseLuaTable } from "@main/utils/parse-lua-table";
import { parseLuaOptions } from "@main/utils/parse-lua-options";
import { BufferStream } from "@main/utils/buffer-stream";
import { logger } from "@main/utils/logger";
import assert from "assert";
import { contentSources } from "@main/config/content-sources";
import { DownloadInfo } from "@main/content/downloads";
import { LuaOptionSection } from "@main/content/game/lua-options";
import { Scenario } from "@main/content/game/scenario";
import { SdpFileMeta, SdpFile } from "@main/content/game/sdp";
import { PrDownloaderAPI } from "@main/content/pr-downloader";
import { RAPID_INDEX_PATH, PACKAGE_PATH, GAME_PATHS, POOL_PATH, SCENARIO_IMAGE_PATH } from "@main/config/app";
import { PoolCdnDownloader } from "@main/content/game/pool-cdn";
import { fileExists } from "@main/utils/file";

const log = logger("game-content.ts");
const gunzip = util.promisify(zlib.gunzip);

export class GameContentAPI extends PrDownloaderAPI<string, GameVersion> {
    public packageGameVersionLookup: { [md5: string]: string | undefined } = {};
    public gameVersionPackageLookup: { [gameVersion: string]: string | undefined } = {};

    public override async init() {
        await this.initLookupTables();
        await this.scanPackagesDir();
        await this.scanLocalGames();
        return this;
    }

    // Reading all existing game versions from rapid versions index so
    // we can easily check if a version is installed from its md5
    protected async initLookupTables() {
        try {
            const versionsGzPath = path.join(RAPID_INDEX_PATH, contentSources.rapid.host, contentSources.rapid.game, "versions.gz");
            const versionsGz = await fs.promises.readFile(versionsGzPath);
            const versions = await promisify(zlib.gunzip)(versionsGz);
            const versionsStr = versions.toString().trim();
            const versionsParts = versionsStr.split("\n");
            for (const versionLine of versionsParts) {
                const [, packageMd5, , version] = versionLine.split(",");
                this.packageGameVersionLookup[packageMd5] = version;
                this.gameVersionPackageLookup[version] = packageMd5;
            }
        } catch (err) {
            log.warn(`Couldn't initialize lookup tables (is this the first startup ?): ${err}`);
        }
    }

    protected async scanPackagesDir() {
        const packagesDir = PACKAGE_PATH;
        await fs.promises.mkdir(packagesDir, { recursive: true });
        const packages = await fs.promises.readdir(packagesDir);
        // Refersh lookup tables in case new versions.gz file was downloaded.
        await this.initLookupTables();
        for (const packageFile of packages) {
            if (!packageFile.endsWith(".sdp")) {
                // skip non-sdp files
                // one case is pr-downloader interruption, which makes .sdp.incomplete files
                log.debug(`Skipping non-sdp file: ${packageFile}!`);
                continue;
            }
            const packageMd5 = packageFile.split(".")[0];
            const gameVersion = this.packageGameVersionLookup[packageMd5];
            const luaOptionSections = await this.getGameOptions(packageMd5);
            const ais = await this.getAis(packageMd5);
            if (gameVersion) {
                this.availableVersions.set(gameVersion, { gameVersion, packageMd5, luaOptionSections, ais });
            } else {
                log.warn(`Not found matching game version for ${packageFile}`);
            }
        }
        log.info(`Found ${this.availableVersions.size} installed game versions`);
        this.availableVersions.forEach((version) => {
            log.info(`-- ${version.gameVersion}`);
        });
    }

    // Load local/custom game files from .sdd folders in the games directory
    protected async scanLocalGames() {
        async function* findLocalGames() {
            // We apply toReversed to keep the precedence order: higher precedence visited later.
            for (const gamesDir of GAME_PATHS.toReversed()) {
                if (await fileExists(gamesDir)) {
                    for (const entry of await fs.promises.readdir(gamesDir, { withFileTypes: true })) {
                        if ((entry.isDirectory() || entry.isSymbolicLink()) && entry.name.endsWith(".sdd")) {
                            yield [gamesDir, entry.name] as const;
                        }
                    }
                }
            }
        }

        log.info("Scanning for local games");
        for await (const [gamesDir, gameDirName] of findLocalGames()) {
            log.info(`-- Game ${gameDirName}`);
            try {
                const modOptionsLua = await fs.promises.readFile(path.join(gamesDir, gameDirName, "modoptions.lua"));
                const luaOptionSections = parseLuaOptions(modOptionsLua);
                const aiInfoLua = await fs.promises.readFile(path.join(gamesDir, gameDirName, "luaai.lua"));
                const ais = await this.parseAis(aiInfoLua);
                const gameVersion = gameDirName;
                this.availableVersions.set(gameVersion, {
                    gameVersion,
                    packageMd5: gameDirName, // kinda hacky since this doesn't have a packageMd5
                    luaOptionSections,
                    ais,
                });
            } catch (err) {
                console.error(err);
            }
        }
    }

    public override isVersionInstalled(version: string) {
        if (version === "byar:test") {
            return false;
        }
        return this.availableVersions.values().some((installedVersion) => installedVersion.gameVersion === version);
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
        log.info(`Downloading game version: ${gameVersion}`);
        const downloadInfo = await this.downloadContent("game", gameVersion);
        await this.downloadComplete(downloadInfo);
        removeFromArray(this.currentDownloads, downloadInfo);
        log.debug(`Downloaded ${downloadInfo.name}`);
    }

    protected async getGameOptions(packageMd5: string): Promise<LuaOptionSection[]> {
        const gameFiles = await this.getGameFiles(packageMd5, "modoptions.lua", true);
        const modoptions = gameFiles[0].data;
        return parseLuaOptions(modoptions);
    }

    protected async getAis(packageMd5: string): Promise<GameAI[]> {
        const gameFiles = await this.getGameFiles(packageMd5, "luaai.lua", true);
        const luaai = gameFiles[0].data;
        return this.parseAis(luaai);
    }

    public async getScenarios(gameVersion?: string) {
        try {
            const version = this.availableVersions.values().find((version) => version.gameVersion === gameVersion);
            assert(version, `No installed version found for game version: ${gameVersion}`);

            const scenarioImages = await this.getGameFiles(version.packageMd5, "singleplayer/scenarios/*.{jpg,png}", false);
            const scenarioDefinitions = (await this.getGameFiles(version.packageMd5, "singleplayer/scenarios/*.lua", true)).filter(({ fileName }) => /[^/]*scenario[^/]*$/.test(fileName));
            const cacheDir = SCENARIO_IMAGE_PATH;

            await fs.promises.mkdir(cacheDir, { recursive: true });
            for (const scenarioImage of scenarioImages) {
                let buffer: Buffer;
                if (scenarioImage.archivePath.endsWith(".gz")) {
                    const data = await fs.promises.readFile(scenarioImage.archivePath);
                    buffer = await gunzip(data);
                } else {
                    buffer = await fs.promises.readFile(scenarioImage.archivePath);
                }
                const fileName = path.parse(scenarioImage.fileName).base;
                await fs.promises.writeFile(path.join(cacheDir, fileName), buffer);
            }
            const scenarios: Scenario[] = [];
            for (const scenarioDefinition of scenarioDefinitions) {
                try {
                    const scenario = parseLuaTable(scenarioDefinition.data) as Scenario;
                    if (scenario.imagepath) {
                        log.debug(`Imagepath: ${scenario.imagepath}`);
                        scenario.imagepath = path.join(cacheDir, scenario.imagepath).replaceAll("\\", "/");
                    } else {
                        log.warn(`No imagepath for scenario: ${scenario.title}`);
                    }
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
        } catch (err) {
            log.error(`Error getting scenarios: ${err}`);
            return [];
        }
    }

    public async uninstallVersionById(gameVersion: string | undefined) {
        if (!gameVersion) {
            throw new Error("Game Version is not specified");
        }
        const version = this.availableVersions.values().find((version) => version.gameVersion === gameVersion);
        if (version) await this.uninstallVersion(version);
    }

    public async uninstallVersion(version: GameVersion) {
        if (!version) {
            throw new Error("Game Version is not specified");
        }

        // TODO: Uninstall game version through prd when prd supports it
        assert(!version.packageMd5.endsWith(".sdd"), "Cannot uninstall local/custom game versions");
        await fs.promises.rm(path.join(PACKAGE_PATH, `${version.packageMd5}.sdp`));
        this.availableVersions.delete(version.gameVersion);
    }

    /**
     * @param filePatterns glob pattern for which files to retrieve
     * @example getGameFiles("Beyond All Reason test-16289-b154c3d", ["units/CorAircraft/T2/*.lua"])
     * @todo make this work for custom .sdd versions
     */
    protected async getGameFiles(packageMd5: string, filePattern: string, parseData?: false): Promise<SdpFileMeta[]>;
    protected async getGameFiles(packageMd5: string, filePattern: string, parseData?: true): Promise<SdpFile[]>;
    protected async getGameFiles(packageMd5: string, filePattern: string, parseData = false): Promise<SdpFileMeta[] | SdpFile[]> {
        // Custom game versions are stored in the games directory
        if (packageMd5.endsWith(".sdd")) {
            const gameDirName = packageMd5;
            const sdpFiles: Array<SdpFileMeta & { data?: Buffer }> = [];
            const customGameDir = await (async () => {
                for (const gamesDir of GAME_PATHS) {
                    const customGameDir = path.join(gamesDir, gameDirName);
                    if (await fileExists(customGameDir)) {
                        return customGameDir;
                    }
                }
                throw new Error(`Custom game directory not found for: ${gameDirName}`);
            })();
            const files = await glob.promise(path.join(customGameDir, filePattern), { windowsPathsNoEscape: true });
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
        // Normal game versions are stored in the packages directory
        const sdpFileName = `${packageMd5}.sdp`;
        const filePath = path.join(PACKAGE_PATH, sdpFileName);
        const sdpEntries = await this.parseSdpFile(filePath, filePattern);
        const sdpFiles: Array<SdpFileMeta & { data?: Buffer }> = [];
        for (const sdpEntry of sdpEntries) {
            const poolDir = sdpEntry.md5.slice(0, 2);
            const archiveFileName = `${sdpEntry.md5.slice(2)}.gz`;
            const archiveFilePath = path.join(POOL_PATH, poolDir, archiveFileName);
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

    protected async parseSdpFile(sdpFilePath: string, filePattern?: string): Promise<SdpFileMeta[]> {
        const sdpFileZipped = await fs.promises.readFile(sdpFilePath);
        const sdpFile = zlib.gunzipSync(sdpFileZipped);
        const bufferStream = new BufferStream(sdpFile, true);
        const fileData: SdpFileMeta[] = [];
        let globPattern: InstanceType<typeof glob.Glob> | undefined;
        if (filePattern) {
            globPattern = new glob.Glob(filePattern, {});
        }
        while (bufferStream.readStream.readableLength > 0) {
            const fileNameLength = bufferStream.readInt(1, true);
            const fileName = bufferStream.readString(fileNameLength);
            const md5 = bufferStream.read(16).toString("hex");
            const crc32 = bufferStream.read(4).toString("hex");
            const filesizeBytes = bufferStream.readInt(4, true);
            const archivePath = path.join(POOL_PATH, md5.slice(0, 2), `${md5.slice(2)}.gz`);
            if (globPattern && globPattern.minimatch.match(fileName)) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
            } else if (!globPattern) {
                fileData.push({ fileName, md5, crc32, filesizeBytes, archivePath });
            }
        }
        return fileData;
    }

    protected override async downloadComplete(downloadInfo: DownloadInfo) {
        const gameVersion = downloadInfo.name;
        await this.scanPackagesDir();
        const packageMd5 = this.gameVersionPackageLookup[gameVersion];
        if (!packageMd5) {
            throw new Error(`No packageMd5 found for game version: ${gameVersion}`);
        }
        const luaOptionSections = await this.getGameOptions(packageMd5);
        const ais = await this.getAis(packageMd5);
        this.availableVersions.set(gameVersion, { gameVersion, packageMd5, luaOptionSections, ais });
        super.downloadComplete(downloadInfo);
    }

    protected async parseAis(aiInfo: Buffer): Promise<GameAI[]> {
        const ais: GameAI[] = [];
        const aiDefinitions = parseLuaTable(aiInfo);
        for (const def of aiDefinitions) {
            ais.push({
                name: def.name,
                shortName: def.name,
                description: def.desc,
            });
        }
        return ais;
    }

    public async preloadPoolData() {
        log.debug("Preloading pool data");
        const poolCdn = new PoolCdnDownloader(this);
        try {
            await poolCdn.preloadPoolData();
        } catch (error) {
            log.warn(error, "Failed preloading pool data, ignoring");
        }
    }

    // TODO reimplement a cleanup function
    // protected async cleanupOldVersions() {
    //     const maxDays = 90;
    //     const oldestDate = new Date();
    //     oldestDate.setDate(oldestDate.getDate() - maxDays);
    //     const versionsToRemove = await cacheDb.selectFrom("gameVersion").where("lastLaunched", "<", oldestDate).select("id").execute();
    //     for (const version of versionsToRemove) {
    //         // TODO: needs https://github.com/beyond-all-reason/pr-downloader/issues/21
    //         // await this.uninstallVersion(version.id);
    //     }
    // }
}

export const gameContentAPI = new GameContentAPI();
