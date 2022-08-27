import axios from "axios";
import * as fs from "fs";
import { removeFromArray } from "jaz-ts-utils";
import * as path from "path";
import { reactive } from "vue";

import { AbstractContentAPI } from "@/api/content/abstract-content-api";
import { contentSources } from "@/config/content-sources";
import type { DownloadInfo, SpringFilesMapMeta } from "@/model/downloads";
import type { MapData } from "@/model/map-data";
import { MapCacheWorkerHost } from "@/workers/map-cache-worker";

export class MapContentAPI extends AbstractContentAPI {
    public readonly installedMaps: Map<string, MapData> = reactive(new Map());
    public readonly mapsPath: string = path.join(this.dataDir, "maps");
    public readonly mapImagesPath: string = path.join(this.dataDir, "map-images");
    public readonly mapCache: MapCacheWorkerHost;

    constructor(userDataDir: string, dataDir: string) {
        super(userDataDir, dataDir);

        this.mapCache = new MapCacheWorkerHost(new Worker(new URL("../../workers/map-cache-worker.ts", import.meta.url), { type: "module" }));
    }

    // TODO: this should await for map cache to be loaded
    public async init() {
        await fs.promises.mkdir(this.mapsPath, { recursive: true });

        const cacheStoreDir = path.join(this.userDataDir, "store");
        const mapCacheFile = path.join(cacheStoreDir, "map-cache.json");

        this.mapCache.on("item-cache-loaded").add((maps: Record<string, MapData>) => {
            for (const [filename, mapData] of Object.entries(maps)) {
                this.installedMaps.set(mapData.scriptName, mapData);
            }
        });

        this.mapCache.on("item-cache-saved").add((maps: Record<string, MapData>) => {
            for (const [filename, mapData] of Object.entries(maps)) {
                this.installedMaps.set(mapData.scriptName, mapData);
            }
        });

        await this.mapCache.init([mapCacheFile, this.dataDir]);

        this.mapCache.cacheItems();

        return this;
    }

    public getMapByFileName(filenameIncludingExt: string) {
        return Array.from(this.installedMaps.values()).find((map) => map.fileNameWithExt === filenameIncludingExt);
    }

    public getMapByScriptName(scriptName: string) {
        return Array.from(this.installedMaps.values()).find((map) => map.scriptName === scriptName) ?? null;
    }

    public async getInstalledMapFilenames() {
        const mapFilenames = await fs.promises.readdir(this.mapsPath);
        return mapFilenames;
    }

    public getMapImagePaths(scriptName: string) {
        const map = this.getMapByScriptName(scriptName);
        if (!map) {
            return;
        }

        return {
            texture: path.join(this.mapImagesPath, `${map.fileName}-texture.jpg`).replaceAll("\\", "/"),
            height: path.join(this.mapImagesPath, `${map.fileName}-height.jpg`).replaceAll("\\", "/"),
            metal: path.join(this.mapImagesPath, `${map.fileName}-metal.jpg`).replaceAll("\\", "/"),
            type: path.join(this.mapImagesPath, `${map.fileName}-type.jpg`).replaceAll("\\", "/"),
        };
    }

    public async downloadMaps(scriptNames: string[], host = contentSources.maps.http[0]) {
        for (const scriptName of scriptNames) {
            await this.downloadMapByScriptName(scriptName, host);
        }
    }

    // currently reliant on springfiles for scriptname lookup
    public async downloadMapByScriptName(scriptName: string, host = contentSources.maps.http[0]!) {
        if (this.getMapByScriptName(scriptName)) {
            console.debug(`Map ${scriptName} is already installed`);
            return;
        }

        const searchUrl = `https://springfiles.springrts.com/json.php?springname=${scriptName}&category=map`;
        const searchResponse = await axios({
            url: searchUrl,
            method: "get",
            responseType: "json",
        });

        if (searchResponse.status !== 200) {
            throw new Error(searchResponse.statusText);
        }

        const mapResult: SpringFilesMapMeta | undefined = searchResponse.data[0];
        if (!mapResult) {
            throw new Error(`${scriptName} not found on springfiles.springrts.com`);
        }

        return this.downloadMapByFilename(mapResult.filename, mapResult.name, host);
    }

    public async downloadMapByFilename(filename: string, scriptName: string, host = contentSources.maps.http[0]!): Promise<void> {
        if (this.getMapByFileName(filename)) {
            console.log(`Map ${filename} is already installed`);
            return;
        }

        if ((await this.getInstalledMapFilenames()).includes(filename)) {
            console.log(`Map ${filename} is already installed, but not cached yet`);
            return;
        }

        try {
            console.log(`Downloading map: ${filename}`);

            const downloadInfo: DownloadInfo = reactive({
                type: "map",
                name: scriptName,
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
            this.onDownloadComplete.dispatch(downloadInfo);

            this.mapCache.cacheItem(dest);
        } catch (err) {
            console.error(`Failed to download map ${filename} from ${host}:`, err);
            const nextMapHostIndex = contentSources.maps.http.indexOf(host) + 1;
            const nextMapHost = contentSources.maps.http[nextMapHostIndex];
            if (nextMapHost) {
                console.log(`Trying next map host: ${nextMapHost}`);
                return this.downloadMapByFilename(filename, nextMapHost);
            } else {
                throw new Error(`Map ${filename} could not be downloaded from any of the configured map hosts`);
            }
        }
    }

    public async uninstallMapByScriptName(scriptName: string) {
        const map = this.getMapByScriptName(scriptName);
        if (!map) {
            console.warn(`Map ${scriptName} is not installed`);
            return;
        }

        await fs.promises.rm(path.join(this.mapsPath, map.fileNameWithExt), { force: true });

        const mapImagePaths = this.getMapImagePaths(scriptName) ?? [];
        for (const mapImagePath of Object.values(mapImagePaths)) {
            await fs.promises.rm(mapImagePath, { force: true });
        }

        this.mapCache.clearItem(map.fileNameWithExt);
        this.installedMaps.delete(scriptName);

        console.log(`Map ${scriptName} uninstalled`);
    }

    public isMapInstalled(map: string) {
        for (const installedMap of this.installedMaps.values()) {
            if (installedMap.scriptName === map) {
                return true;
            }
        }
        return false;
    }
}
