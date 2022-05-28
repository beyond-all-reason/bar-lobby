import axios from "axios";
import * as fs from "fs";
import { removeFromArray } from "jaz-ts-utils";
import * as path from "path";
import { reactive } from "vue";

import { AbstractContentAPI } from "@/api/content/abstract-content-api";
import { contentSources } from "@/config/content-sources";
import type { DownloadInfo } from "@/model/downloads";
import type { MapData } from "@/model/map-data";
import { MapCacheWorkerHost } from "@/workers/map-cache-worker";

export class MapContentAPI extends AbstractContentAPI {
    // null means map is installed but isn't cached
    public readonly installedMaps: Record<string, MapData | null | undefined> = reactive({});
    public readonly mapsPath: string = path.join(this.dataDir, "maps");
    public readonly mapImagesPath: string = path.join(this.dataDir, "map-images");

    protected mapCache: MapCacheWorkerHost;

    constructor(userDataDir: string, dataDir: string) {
        super(userDataDir, dataDir);

        this.mapCache = new MapCacheWorkerHost(new Worker(new URL("../../workers/map-cache-worker.ts", import.meta.url), { type: "module" }));
    }

    // TODO: this should await for map cache to be loaded
    public async init() {
        await fs.promises.mkdir(this.mapsPath, { recursive: true });

        const mapFilenames = await this.getInstalledMapFilenames();
        for (const mapFilename of mapFilenames) {
            this.installedMaps[mapFilename] = null;
        }

        const cacheStoreDir = path.join(this.userDataDir, "store");
        const mapCacheFile = path.join(cacheStoreDir, "map-cache.json");

        this.mapCache.on("item-cache-loaded").add((maps: Record<string, MapData>) => {
            for (const [filename, mapData] of Object.entries(maps)) {
                if (!mapFilenames.includes(filename)) {
                    this.installedMaps[filename] = undefined;
                    this.mapCache.clearItem(filename);
                } else {
                    this.installedMaps[filename] = mapData;
                }
            }
        });

        this.mapCache.on("item-cache-saved").add((maps: Record<string, MapData>) => {
            for (const [filename, mapData] of Object.entries(maps)) {
                this.installedMaps[filename] = mapData;
            }
        });

        await this.mapCache.init([mapCacheFile, this.dataDir]);

        this.mapCache.cacheItems();

        return this;
    }

    public getMapByFileName(filenameIncludingExt: string) {
        return this.installedMaps[filenameIncludingExt];
    }

    public getMapByScriptName(scriptName: string) {
        return Object.values(this.installedMaps).find((map) => map?.scriptName === scriptName);
    }

    public async getInstalledMapFilenames() {
        const mapFilenames = await fs.promises.readdir(this.mapsPath);
        return mapFilenames;
    }

    public getMapImagePaths(filename: string) {
        if (this.installedMaps[filename] === undefined) {
            return null;
        }

        const filenameWithoutExt = path.parse(filename).name;

        return {
            texture: path.join(this.mapImagesPath, `${filenameWithoutExt}-texture.jpg`).replaceAll("\\", "/"),
            height: path.join(this.mapImagesPath, `${filenameWithoutExt}-height.jpg`).replaceAll("\\", "/"),
            metal: path.join(this.mapImagesPath, `${filenameWithoutExt}-metal.jpg`).replaceAll("\\", "/"),
            type: path.join(this.mapImagesPath, `${filenameWithoutExt}-type.jpg`).replaceAll("\\", "/"),
        };
    }

    public async downloadMaps(filenames: string[], host = contentSources.maps.http[0]) {
        for (const filename of filenames) {
            await this.downloadMap(filename, host);
        }
    }

    public async downloadMap(filename: string, host = contentSources.maps.http[0]!): Promise<void> {
        if (this.installedMaps[filename] !== undefined) {
            console.log(`Map ${filename} is already installed`);
            return;
        }

        try {
            console.log(`Downloading map: ${filename}`);

            const downloadInfo: DownloadInfo = reactive({
                type: "map",
                name: filename,
                currentBytes: 0,
                totalBytes: 1,
            });

            this.currentDownloads.push(downloadInfo);

            const downloadResponse = await axios({
                url: `${host}${filename}`,
                method: "get",
                responseType: "arraybuffer",
                headers: { "Content-Type": "application/7z" },
                adapter: require("axios/lib/adapters/http"),
                onDownloadProgress: (progress) => {
                    downloadInfo.currentBytes = progress.loaded;
                    downloadInfo.totalBytes = progress.total;
                },
            });

            if (downloadResponse.status !== 200) {
                throw new Error(downloadResponse.statusText);
            }

            const dest = path.join(this.mapsPath, filename);
            await fs.promises.writeFile(dest, Buffer.from(downloadResponse.data), { encoding: "binary" });

            console.log(`Map downloaded successfully: ${filename}`);

            removeFromArray(this.currentDownloads, downloadInfo);

            this.mapCache.cacheItem(dest);
        } catch (err) {
            console.error(`Failed to download map ${filename} from ${host}:`, err);
            const nextMapHostIndex = contentSources.maps.http.indexOf(host) + 1;
            const nextMapHost = contentSources.maps.http[nextMapHostIndex];
            if (nextMapHost) {
                console.log(`Trying next map host: ${nextMapHost}`);
                return this.downloadMap(filename, nextMapHost);
            } else {
                throw new Error(`Map ${filename} could not be downloaded from any of the configured map hosts`);
            }
        }
    }

    public async uninstallMap(filename: string) {
        if (this.installedMaps[filename] === undefined) {
            console.warn(`Map ${filename} is not installed`);
            return;
        }

        await fs.promises.rm(path.join(this.mapsPath, filename), { force: true });

        const mapImagePaths = this.getMapImagePaths(filename) ?? [];
        for (const mapImagePath of Object.values(mapImagePaths)) {
            await fs.promises.rm(mapImagePath, { force: true });
        }

        this.mapCache.clearItem(filename);
        delete this.installedMaps[filename];

        console.log(`Map ${filename} uninstalled`);
    }

    public scriptNameToFriendlyName(mapScriptName: string) {
        return mapScriptName.replaceAll("_", " ");
    }
}
