// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import { removeFromArray } from "$/jaz-ts-utils/object";
import * as path from "path";
import { promisify } from "util";
import zlib from "zlib";
import { GameAI, GameVersion } from "@main/content/game/game-version";
import { parseLuaTable } from "@main/utils/parse-lua-table";
import { parseLuaOptions } from "@main/utils/parse-lua-options";
import { logger } from "@main/utils/logger";
import assert from "assert";
import { contentSources } from "@main/config/content-sources";
import { DownloadInfo } from "@main/content/downloads";
import { getGameFiles } from "@main/content/game/game-files";
import { LuaOptionSection } from "@main/content/game/lua-options";
import { PrDownloaderAPI } from "@main/content/pr-downloader";
import { getRapidIndexPath, getPackagePath, getPoolPath, getGamePaths } from "@main/config/app";
import { fileExists } from "@main/utils/file";
import { engineProvider } from "@main/content/engine/engine-provider";
import { calcChecksum } from "@main/utils/checksums";

const log = logger("game-provider.ts");

export class GameProvider extends PrDownloaderAPI<string, GameVersion> {
    public packageGameVersionLookup: { [md5: string]: string | undefined } = {};
    public gameVersionPackageLookup: { [gameVersion: string]: string | undefined } = {};

    public override async init() {
        await this.initLookupTables();
        await this.scanPackagesDir();
        await this.scanLocalGames();

        engineProvider.onDownloadComplete.add((downloadInfo) => {
            for (const gameVersion of this.availableVersions.keys()) {
                calcChecksum(downloadInfo.name, gameVersion);
            }
        });

        return this;
    }

    public async reinit() {
        for (const dir of [getPackagePath(), getPoolPath(), getRapidIndexPath()]) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        this.availableVersions.clear();
        this.packageGameVersionLookup = {};
        this.gameVersionPackageLookup = {};
        await this.init();
    }

    // Reading all existing game versions from rapid versions index so
    // we can easily check if a version is installed from its md5
    protected async initLookupTables() {
        try {
            const versionsGzPath = path.join(getRapidIndexPath(), contentSources.rapid.host, contentSources.rapid.game, "versions.gz");
            const versionsGz = await fs.promises.readFile(versionsGzPath);
            const versions = await promisify(zlib.gunzip)(versionsGz);
            const versionsStr = versions.toString().trim();
            const versionsParts = versionsStr.split("\n");
            for (const versionLine of versionsParts) {
                const [tag, packageMd5, , version] = versionLine.split(",");
                this.packageGameVersionLookup[packageMd5] = version;
                this.gameVersionPackageLookup[version] = packageMd5;
                // The tag names whichever build it currently points at, so it has to resolve too or
                // asking for one can never be answered.
                this.gameVersionPackageLookup[tag] = packageMd5;
            }
        } catch (err) {
            log.warn(`Couldn't initialize lookup tables (is this the first startup ?): ${err}`);
        }
    }

    protected async scanPackagesDir() {
        const packagesDir = getPackagePath();
        let packages: string[];
        try {
            packages = await fs.promises.readdir(packagesDir);
        } catch {
            return;
        }
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
            for (const gamesDir of getGamePaths().toReversed()) {
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

    // Resolved through the rapid index first, so a tag answers for the build it points at now rather than
    // being looked for literally and never found.
    public override isVersionInstalled(version: string) {
        const packageMd5 = this.gameVersionPackageLookup[version];
        const resolved = packageMd5 ? (this.packageGameVersionLookup[packageMd5] ?? version) : version;

        return this.availableVersions.values().some((installedVersion) => installedVersion.gameVersion === resolved);
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

    public getVersion(gameVersion: string) {
        return this.availableVersions.values().find((version) => version.gameVersion === gameVersion);
    }

    protected async getGameOptions(packageMd5: string): Promise<LuaOptionSection[]> {
        const gameFiles = await getGameFiles(packageMd5, "modoptions.lua", true);
        const modoptions = gameFiles[0].data;
        return parseLuaOptions(modoptions);
    }

    protected async getAis(packageMd5: string): Promise<GameAI[]> {
        const gameFiles = await getGameFiles(packageMd5, "luaai.lua", true);
        const luaai = gameFiles[0].data;
        return this.parseAis(luaai);
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

        assert(!version.packageMd5.endsWith(".sdd"), "Cannot uninstall local/custom game versions");

        await this.uninstallContent(version.packageMd5);
        this.availableVersions.delete(version.gameVersion);
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

        const defaultEngine = engineProvider.getDefaultEngine();
        if (defaultEngine?.installed) {
            calcChecksum(defaultEngine.id, gameVersion);
        }
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

export const gameProvider = new GameProvider();
