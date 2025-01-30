import axios from "axios";
import * as fs from "fs";
import * as glob from "glob-promise";
import { removeFromArray } from "$/jaz-ts-utils/object";
import { Octokit } from "@octokit/rest";
import * as path from "path";
import { EngineAI, EngineVersion } from "@main/content/engine/engine-version";
import { DownloadInfo } from "../downloads";
import { parseLuaTable } from "@main/utils/parse-lua-table";
import { parseLuaOptions } from "@main/utils/parse-lua-options";
import { logger } from "@main/utils/logger";
import { extract7z } from "@main/utils/extract-7z";
import { contentSources } from "@main/config/content-sources";
import { AbstractContentAPI } from "@main/content/abstract-content";
import { CONTENT_PATH } from "@main/config/app";

const log = logger("engine-content.ts");

// TODO: add support for old engine version tag naming scheme, careful it is not string sortable (!)
// Regex matching new engine version tags (e.g. "2025.01.3", "2025.01.3-rc1")
const compatibleVersionRegex = /^\d{4}\.\d{2}\.\d{1,2}(-rc\d+)?$/;

export class EngineContentAPI extends AbstractContentAPI<string, EngineVersion> {
    protected readonly engineDirs = path.join(CONTENT_PATH, "engine");
    protected readonly ocotokit = new Octokit();

    public override async init() {
        try {
            log.info("Initializing engine content API");
            await fs.promises.mkdir(this.engineDirs, { recursive: true });
            const files = await fs.promises.readdir(this.engineDirs, { withFileTypes: true });
            const dirs = files
                .filter((file) => file.isDirectory() || file.isSymbolicLink())
                .map((dir) => dir.name)
                .filter((dir) => compatibleVersionRegex.test(dir) || dir.includes("local"));
            log.info(`Found ${dirs.length} installed engine versions`);
            for (const dir of dirs) {
                log.info(`-- Engine ${dir}`);
                const ais = await this.parseAis(dir);
                this.availableVersions.set(dir, { id: dir, ais, installed: true });
            }
            try {
                await this.fetchAvailableVersionsOnline();
            } catch (err) {
                log.error(`Failed to fetch available engine versions online: ${err}`);
            }
            log.info(`Found ${this.availableVersions.size} engine versions total.`);
        } catch (err) {
            log.error(err);
        }
        return this;
    }

    public isVersionInstalled(id: string): boolean {
        return this.availableVersions.get(id)?.installed ?? false;
    }

    public getLatestInstalledVersion() {
        return this.availableVersions
            .values()
            .filter((version) => version.installed)
            .toArray()
            .sort((a, b) => a.id.localeCompare(b.id))
            .at(-1);
    }

    protected async fetchAvailableVersionsOnline() {
        const { data } = await this.ocotokit.rest.repos.listReleases({
            owner: contentSources.engineGitHub.owner,
            repo: contentSources.engineGitHub.repo,
        });
        data.map((release) => release.tag_name)
            .filter((tag) => compatibleVersionRegex.test(tag))
            .filter((tag) => !this.availableVersions.has(tag))
            .map((tag) => {
                return {
                    id: tag,
                    ais: [],
                    installed: false,
                };
            })
            .forEach((version) => {
                this.availableVersions.set(version.id, version);
            });
    }

    public async downloadEngine(engineVersion: string) {
        try {
            if (this.isVersionInstalled(engineVersion)) {
                return;
            }
            const { data } = await this.ocotokit.rest.repos.getReleaseByTag({
                owner: contentSources.engineGitHub.owner,
                repo: contentSources.engineGitHub.repo,
                tag: engineVersion,
            });
            if (!data) {
                throw new Error(`Couldn't find engine release for tag: ${engineVersion}`);
            }
            const archStr = process.platform === "win32" ? "windows" : "linux";
            const asset = data.assets.find((asset) => asset.name.includes(archStr) && asset.name.includes("portable"));
            if (!asset) {
                throw new Error("Failed to fetch engine release asset");
            }
            const downloadInfo: DownloadInfo = {
                type: "engine",
                name: engineVersion,
                currentBytes: 0,
                totalBytes: 1,
            };
            this.currentDownloads.push(downloadInfo);
            this.downloadStarted(downloadInfo);
            log.info(`Downloading engine: ${engineVersion}`);
            const downloadResponse = await axios({
                url: asset.browser_download_url,
                method: "get",
                responseType: "arraybuffer",
                headers: { "Content-Type": "application/7z" },
                onDownloadProgress: (progress) => {
                    downloadInfo.currentBytes = progress.loaded;
                    downloadInfo.totalBytes = progress.total;
                    this.downloadProgress(downloadInfo);
                },
            });
            const engine7z = downloadResponse.data as ArrayBuffer;
            const downloadedFilePath = path.join(this.engineDirs, asset.name);
            const engineDestinationPath = path.join(this.engineDirs, engineVersion);
            log.info(`Extracting <${asset.name}> to ${engineDestinationPath}`);
            await fs.promises.mkdir(this.engineDirs, { recursive: true });
            await fs.promises.writeFile(downloadedFilePath, Buffer.from(engine7z), { encoding: "binary" });
            await extract7z(downloadedFilePath, engineDestinationPath);
            await fs.promises.unlink(downloadedFilePath);
            removeFromArray(this.currentDownloads, downloadInfo);
            log.info(`Extracted engine <${asset.name}>`);
            await this.downloadComplete(downloadInfo);
            log.info(`Downloaded engine: ${engineVersion}`);
            return engineVersion;
        } catch (err) {
            log.error(err);
        }
    }

    public async uninstallVersion(version: EngineVersion | string) {
        if (typeof version === "object") {
            version = version.id;
        }
        const engineDir = path.join(this.engineDirs, version);
        await fs.promises.rm(engineDir, { force: true, recursive: true });
        this.availableVersions.delete(version);
    }

    protected override async downloadComplete(downloadInfo: DownloadInfo) {
        log.debug(`Download complete: ${downloadInfo.name}`);
        this.availableVersions.set(downloadInfo.name, { id: downloadInfo.name, ais: [], installed: true });
        super.downloadComplete(downloadInfo);
    }

    protected async parseAis(engineVersion: string): Promise<EngineAI[]> {
        const ais: EngineAI[] = [];
        const aisPath = path.join(this.engineDirs, engineVersion, "AI", "Skirmish");
        const aiDirs = await fs.promises.readdir(aisPath);
        for (const aiDir of aiDirs) {
            try {
                const ai = await this.parseAi(path.join(aisPath, aiDir));
                ais.push(ai);
            } catch (err) {
                console.error(`Error parsing AI: ${aiDir}`, err);
            }
        }
        return ais;
    }

    protected async parseAi(aiPath: string): Promise<EngineAI> {
        const aiDefinitions = await glob.promise(`${aiPath}/**/{AIInfo.lua,AIOptions.lua}`, { windowsPathsNoEscape: true });
        const aiInfoPath = aiDefinitions.find((filePath) => filePath.endsWith("AIInfo.lua"));
        const aiOptionsPath = aiDefinitions.find((filePath) => filePath.endsWith("AIOptions.lua"));
        if (aiInfoPath === undefined) {
            throw new Error(`AIInfo.lua not found in ${aiPath}`);
        }
        if (aiOptionsPath === undefined) {
            throw new Error(`AIOptions.lua not found in ${aiPath}`);
        }
        const aiInfoFile = await fs.promises.readFile(aiInfoPath);
        const aiInfoFields = parseLuaTable(aiInfoFile);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aiInfo: Record<string, any> = {};
        for (const field of aiInfoFields) {
            aiInfo[field.key] = field.value;
        }
        const aiOptionsFile = await fs.promises.readFile(aiOptionsPath);
        const aiOptions = parseLuaOptions(aiOptionsFile);
        return {
            shortName: aiInfo.shortName,
            name: aiInfo.name,
            description: aiInfo.description,
            version: aiInfo.version,
            options: aiOptions,
        };
    }

    //TODO move this check to front
    // protected async cleanupOldVersions() {
    //     log.info("Cleaning up old engine versions");
    //     const maxDays = 90;
    //     const oldestDate = new Date();
    //     oldestDate.setDate(oldestDate.getDate() - maxDays);
    //     const versionsToRemove = await cacheDb.selectFrom("engineVersion").where("lastLaunched", "<", oldestDate).select("id").execute();
    //     for (const version of versionsToRemove) {
    //         await this.uninstallVersion(version.id);
    //     }
    // }
}

export const engineContentAPI = new EngineContentAPI();
