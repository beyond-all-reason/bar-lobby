import axios from "axios";
import * as fs from "fs";
import * as glob from "glob-promise";
import { removeFromArray } from "$/jaz-ts-utils/object";
import * as path from "path";
import { EngineAI, EngineVersion } from "@main/content/engine/engine-version";
import { DownloadInfo } from "../downloads";
import { parseLuaTable } from "@main/utils/parse-lua-table";
import { parseLuaOptions } from "@main/utils/parse-lua-options";
import { logger } from "@main/utils/logger";
import { extract7z } from "@main/utils/extract-7z";
import { contentSources } from "@main/config/content-sources";
import { LATEST_ENGINE_VERSION } from "@main/config/default-versions";
import { AbstractContentAPI } from "@main/content/abstract-content";
import { CONTENT_PATH } from "@main/config/app";
import { DownloadEngine } from "@main/content/game/type";

const log = logger("engine-content.ts");

// TODO: add support for old engine version tag naming scheme, careful it is not string sortable (!)
// Regex matching new engine version tags (e.g. "2025.01.3", "2025.01.3-rc1")
const compatibleVersionRegex = /^\d{4}\.\d{2}\.\d{1,2}(-rc\d+)?$/;

export class EngineContentAPI extends AbstractContentAPI<string, EngineVersion> {
    protected readonly engineDirs = path.join(CONTENT_PATH, "engine");

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
        try {
            log.info("Fetching available engine versions online");

            // Use the API endpoint to get available engine versions
            const platform = process.platform === "win32" ? "windows64" : "linux64";
            const url = new URL(contentSources.api.findEndpoint, contentSources.api.baseUrl);
            url.searchParams.set("category", `engine_${platform}`);

            const { data } = await axios.get(url.toString());

            if (!data || !Array.isArray(data)) {
                log.error("Failed to fetch engine versions: Invalid response format");
                return;
            }

            data.forEach((item) => {
                const version: EngineVersion = {
                    id: item.springname,
                    installed: false,
                    ais: [],
                };
                this.availableVersions.set(version.id, version);
            });
        } catch (error) {
            log.error("Failed to fetch engine versions:", error);
        }
    }

    public downloadEngine: DownloadEngine = async (engineVersion) => {
        if (!engineVersion) {
            throw new Error("Engine Version is not specified");
        }

        // If LATEST is specified, we should use a specific hardcoded version
        // In the future, this should be configured via the master server (#291)
        if (engineVersion === LATEST_ENGINE_VERSION) {
            // For now, we'll use a hardcoded version that we know works with the game
            // This should be updated when a new stable engine version is released
            engineVersion = "2025.01.3"; // Hardcoded stable version
            log.info(`Using hardcoded stable engine version: ${engineVersion}`);
        }

        try {
            if (this.isVersionInstalled(engineVersion)) {
                log.debug(`Engine version ${engineVersion} is already installed, skipping download`);
                return;
            }

            // Use the recommended API endpoint
            const platform = process.platform === "win32" ? "windows64" : "linux64";
            const url = new URL(contentSources.api.findEndpoint, contentSources.api.baseUrl);
            url.searchParams.set("category", `engine_${platform}`);
            url.searchParams.set("springname", engineVersion);

            log.debug(`Fetching engine download URL from: ${url.toString()}`);

            const { data } = await axios.get(apiUrl);

            // Log the response data for debugging
            log.debug(`API response for engine ${engineVersion}: ${JSON.stringify(data)}`);

            // The API returns an array of objects, so we need to check if there are any results
            if (!data || !Array.isArray(data) || data.length === 0) {
                const errorMsg = `Couldn't find engine download URL for version: ${engineVersion}`;
                log.error(errorMsg);
                throw new Error(errorMsg);
            }

            // Get the first result
            const engineData = data[0];
            log.debug(`Engine data for ${engineVersion}: ${JSON.stringify(engineData)}`);

            // Check if the engine data has mirrors
            if (!engineData.mirrors || !Array.isArray(engineData.mirrors) || engineData.mirrors.length === 0) {
                const errorMsg = `Engine data doesn't contain any download mirrors for version: ${engineVersion}`;
                log.error(errorMsg);
                throw new Error(errorMsg);
            }

            // Use the first mirror URL
            const downloadUrl = engineData.mirrors[0];
            log.debug(`Found engine download URL for ${engineVersion}: ${downloadUrl}`);

            const downloadInfo: DownloadInfo = {
                type: "engine",
                name: engineVersion,
                currentBytes: 0,
                totalBytes: 1,
            };

            this.currentDownloads.push(downloadInfo);
            this.downloadStarted(downloadInfo);
            log.info(`Starting engine download for ${engineVersion} from ${downloadUrl}`);

            const downloadResponse = await axios({
                url: downloadUrl,
                method: "GET",
                responseType: "arraybuffer",
                headers: { "Content-Type": "application/7z" },
                onDownloadProgress: (progressEvent) => {
                    downloadInfo.currentBytes = progressEvent.loaded;
                    downloadInfo.totalBytes = progressEvent.total || -1;
                    this.downloadProgress(downloadInfo);
                },
            });

            const engine7z = downloadResponse.data as ArrayBuffer;

            // Get filename from Content-Disposition header or use a default name
            let filename = "engine.7z";
            const contentDisposition = downloadResponse.headers["content-disposition"];
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            const downloadedFilePath = path.join(this.engineDirs, filename);
            const engineDestinationPath = path.join(this.engineDirs, engineVersion);

            log.info(`Extracting <${filename}> to ${engineDestinationPath}`);
            await fs.promises.mkdir(this.engineDirs, { recursive: true });
            await fs.promises.writeFile(downloadedFilePath, Buffer.from(engine7z), { encoding: "binary" });
            await extract7z(downloadedFilePath, engineDestinationPath);
            await fs.promises.unlink(downloadedFilePath);
            removeFromArray(this.currentDownloads, downloadInfo);
            log.info(`Extracted engine <${filename}>`);
            await this.downloadComplete(downloadInfo);
            log.info(`Downloaded engine: ${engineVersion}`);

            return engineVersion;
        } catch (err) {
            log.error("Failed to fetch engine release asset", { err });
            throw new Error("Failed to fetch engine release asset");
        }
    };

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
