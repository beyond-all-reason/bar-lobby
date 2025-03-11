import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { removeFromArray } from "$/jaz-ts-utils/object";

import { MapData } from "@main/content/maps/map-data";
import { logger } from "@main/utils/logger";
import { Signal } from "$/jaz-ts-utils/signal";
import { PrDownloaderAPI } from "@main/content/pr-downloader";
import { CONTENT_PATH } from "@main/config/app";
import { UltraSimpleMapParser } from "$/map-parser/ultrasimple-map-parser";
import { DownloadInfo } from "../downloads";

const log = logger("map-content.ts");

/**
 * @todo replace queue method with syncMapCache function once prd returns map file name
 */
export class MapContentAPI extends PrDownloaderAPI<string, MapData> {
    public mapNameFileNameLookup: { [springName: string]: string | undefined } = {};
    public fileNameMapNameLookup: { [fileName: string]: string | undefined } = {};

    public readonly onMapAdded: Signal<string> = new Signal();
    public readonly onMapDeleted: Signal<string> = new Signal();

    protected readonly mapsDir = path.join(CONTENT_PATH, "maps");
    protected readonly mapCacheQueue: Set<string> = new Set();
    protected cachingMaps = false;

    public override async init() {
        await fs.promises.mkdir(this.mapsDir, { recursive: true });
        this.initLookupMaps();
        this.startWatchingMapFolder();
        return super.init();
    }

    protected async initLookupMaps() {
        const filePaths = await fs.promises.readdir(this.mapsDir);
        const sd7filePaths = filePaths.filter((path) => path.endsWith(".sd7"));
        log.debug(`Found ${sd7filePaths.length} maps`);
        for (const filePath of sd7filePaths) {
            try {
                const mapName = await this.getMapNameFromFile(filePath);
                const fileName = path.basename(filePath);

                this.mapNameFileNameLookup[mapName] = fileName;
                this.fileNameMapNameLookup[fileName] = mapName;
            } catch (err) {
                log.error(`File may be corrupted, removing ${filePath}: ${err}`);
                fs.promises.rm(path.join(this.mapsDir, filePath));
            }
        }
        log.info(`Found ${Object.keys(this.mapNameFileNameLookup).length} maps`);
    }

    protected async getMapNameFromFile(file: string) {
        const ultraSimpleMapParser = new UltraSimpleMapParser();
        const parsedMap = await ultraSimpleMapParser.parseMap(path.join(this.mapsDir, file));
        return parsedMap.springName;
    }

    protected startWatchingMapFolder() {
        // Using chokidar to watch for changes in the maps folder
        import("chokidar")
            .then((chokidarModule) => {
                const watcher = chokidarModule.default.watch(this.mapsDir, {
                    ignored: /(^|[/\\])\./, // ignore dotfiles
                    persistent: true,
                });

                watcher.on("add", async (filePath: string) => {
                    const pathBaseName = filePath.split(/[/\\]/).pop() || "";
                    if (pathBaseName.endsWith(".sd7")) {
                        const mapName = await this.getMapNameFromFile(pathBaseName);
                        if (mapName) {
                            this.mapNameFileNameLookup[mapName] = pathBaseName;
                            this.fileNameMapNameLookup[pathBaseName] = mapName;
                            this.onMapAdded.dispatch(mapName);
                        }
                    }
                });

                watcher.on("unlink", (filePath: string) => {
                    const pathBaseName = filePath.split(/[/\\]/).pop() || "";
                    if (pathBaseName.endsWith(".sd7")) {
                        const mapName = this.fileNameMapNameLookup[pathBaseName];
                        if (mapName) {
                            delete this.mapNameFileNameLookup[mapName];
                            delete this.fileNameMapNameLookup[pathBaseName];
                            this.onMapDeleted.dispatch(mapName);
                        }
                    }
                });
            })
            .catch((err) => {
                log.warn("chokidar not available, file watching will be disabled", { err });
            });
    }

    public isVersionInstalled(springName: string): boolean {
        return this.mapNameFileNameLookup[springName] !== undefined;
    }

    public async downloadMaps(springNames: string[]) {
        return Promise.all(springNames.map((springName) => this.downloadMap(springName)));
    }

    public async downloadMap(springName: string) {
        try {
            // Skip if already installed or currently downloading
            if (this.isVersionInstalled(springName)) {
                log.debug(`Map ${springName} is already installed, skipping download`);
                return;
            }
            if (this.currentDownloads.some((download) => download.name === springName)) {
                log.debug(`Map ${springName} is already being downloaded, waiting for completion`);
                return await new Promise<void>((resolve) => {
                    this.onDownloadComplete.addOnce((mapData) => {
                        if (mapData.name === springName) {
                            log.debug(`Existing download for map ${springName} completed`);
                            resolve();
                        }
                    });
                });
            }

            log.info(`Downloading map: ${springName}`);

            // Use the API endpoint to get download information
            const apiUrl = `https://files-cdn.beyondallreason.dev/find?category=map&springname=${encodeURIComponent(springName)}`;
            log.debug(`Fetching map download URL from: ${apiUrl}`);

            const { data } = await axios.get(apiUrl);
            log.debug(`API response for map ${springName}: ${JSON.stringify(data)}`);

            // Check if we got valid data
            if (!data || !Array.isArray(data) || data.length === 0) {
                const errorMsg = `Couldn't find map download information for: ${springName}`;
                log.error(errorMsg);
                throw new Error(errorMsg);
            }

            // Get the first result
            const mapData = data[0];
            log.debug(`Map data for ${springName}: ${JSON.stringify(mapData)}`);

            // Check if we have mirrors
            if (!mapData.mirrors || !Array.isArray(mapData.mirrors) || mapData.mirrors.length === 0) {
                const errorMsg = `Map data doesn't contain any download mirrors for: ${springName}`;
                log.error(errorMsg);
                throw new Error(errorMsg);
            }

            // Use the first mirror URL
            const downloadUrl = mapData.mirrors[0];
            log.debug(`Found map download URL for ${springName}: ${downloadUrl}`);

            // Create download info
            const downloadInfo: DownloadInfo = {
                type: "map",
                name: springName,
                currentBytes: 0,
                totalBytes: mapData.size || 1,
            };

            // Add to current downloads and notify
            this.currentDownloads.push(downloadInfo);
            this.downloadStarted(downloadInfo);

            // Download the map
            const downloadResponse = await axios({
                url: downloadUrl,
                method: "GET",
                responseType: "arraybuffer",
                onDownloadProgress: (progressEvent) => {
                    downloadInfo.currentBytes = progressEvent.loaded;
                    downloadInfo.totalBytes = progressEvent.total || mapData.size || -1;
                    this.downloadProgress(downloadInfo);
                },
            });

            // Get the downloaded data
            const mapArchive = downloadResponse.data as ArrayBuffer;

            // Get filename from Content-Disposition header or use a default name
            let filename = mapData.filename || `${springName}.sd7`;
            const contentDisposition = downloadResponse.headers["content-disposition"];
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            // Save the downloaded file to the maps directory
            await fs.promises.mkdir(this.mapsDir, { recursive: true });
            const filePath = path.join(this.mapsDir, filename);

            log.debug(`Saving map archive to: ${filePath}`);
            await fs.promises.writeFile(filePath, Buffer.from(mapArchive), { encoding: "binary" });

            // Update the lookup tables
            this.mapNameFileNameLookup[springName] = filename;
            this.fileNameMapNameLookup[filename] = springName;

            // Complete the download
            await this.downloadComplete(downloadInfo);
            removeFromArray(this.currentDownloads, downloadInfo);
            this.onDownloadComplete.dispatch(downloadInfo);
            this.onMapAdded.dispatch(springName);
            log.info(`Downloaded map: ${springName}`);

            return;
        } catch (err: unknown) {
            log.error(`Failed to download map: ${springName}`, { err });
            throw new Error(`Failed to download map: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    public async attemptCacheErrorMaps() {
        throw new Error("Method not implemented.");
    }

    public async scanFolderForMaps() {
        let mapFiles = await fs.promises.readdir(this.mapsDir);
        mapFiles = mapFiles.filter((mapFile) => mapFile.endsWith("sd7"));
        return mapFiles;
    }

    public async uninstallVersion(version: MapData) {
        const mapFile = path.join(this.mapsDir, version.filename);
        await fs.promises.rm(mapFile, { force: true, recursive: true });
        log.debug(`Map removed: ${version.springName}`);
    }
}

export const mapContentAPI = new MapContentAPI();
