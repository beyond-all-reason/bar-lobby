import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { AbstractContentAPI } from "@/api/content/abstract-content";
import { MapData } from "@/model/map-data";
import { MapCacheWorkerHost } from "@/workers/map-cache-worker";
import { contentSources } from "@/config/content-sources";
import { Signal } from "jaz-ts-utils";
import { reactive } from "vue";

export class MapContentAPI extends AbstractContentAPI {
    public onMapDlProgress: Signal<{ currentBytes: number; totalBytes: number }> = new Signal();
    public onMapsDlProgress: Signal<{ mapsToDownload: string[], currentMapDownloading: string, currentMapNumberDownloading: number }> = new Signal();

    // null means map is installed but isn't cached
    protected readonly maps: Record<string, MapData | null | undefined> = reactive({});
    protected mapCache: MapCacheWorkerHost;

    constructor(userDataDir: string, dataDir: string) {
        super(userDataDir, dataDir);

        this.mapCache = new MapCacheWorkerHost(new Worker(new URL("../../workers/map-cache-worker.ts", import.meta.url), { type: "module" }));
    }

    public async init() {
        const mapFilenames = await this.getInstalledMapFilenames();
        for (const mapFilename of mapFilenames) {
            this.maps[mapFilename] = null;
        }

        const cacheStoreDir = path.join(this.userDataDir, "store");
        const mapCacheFile = path.join(cacheStoreDir, "map-cache.json");

        this.mapCache.on("item-cache-loaded").add((maps: Record<string, MapData>) => {
            for (const [filename, mapData] of Object.entries(maps)) {
                if (!mapFilenames.includes(filename)) {
                    this.maps[filename] = undefined;
                    this.mapCache.send("clear-item", filename);
                } else {
                    this.maps[filename] = mapData;
                }
            }
        });

        this.mapCache.on("item-cache-saved").add((maps: Record<string, MapData>) => {
            for (const [filename, mapData] of Object.entries(maps)) {
                this.maps[filename] = mapData;
            }
        });

        await this.mapCache.init([ mapCacheFile, this.dataDir ]);

        this.mapCache.cacheItems();

        return this;
    }

    public getMaps() {
        return this.maps;
    }

    public getMapByFilename(filename: string) {
        return this.maps[filename];
    }

    public getMapByScriptName(scriptName: string) {
        return Object.values(this.maps).find((map) => map?.scriptName === scriptName);
    }

    public async getInstalledMapFilenames() {
        const mapsPath = this.getMapsPath();
        const mapFilenames = await fs.promises.readdir(mapsPath);
        return mapFilenames;
    }

    public getMapImages(filename: string) {
        if (this.getMapByFilename(filename)) {
            const filenameWithoutExt = path.parse(filename).name;

            return {
                texture: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-texture.jpg`).replaceAll("\\", "/"),
                height: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-height.jpg`).replaceAll("\\", "/"),
                metal: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-metal.jpg`).replaceAll("\\", "/"),
                type: path.join(this.getMapImagesPath(), `${filenameWithoutExt}-type.jpg`).replaceAll("\\", "/"),
            };
        }

        return;
    }

    public getMapsPath() {
        return path.join(this.dataDir, "maps").replaceAll("\\", "/");
    }

    public getMapImagesPath() {
        return path.join(this.dataDir, "map-images").replaceAll("\\", "/");
    }

    public async downloadMaps(maps: string[]) {
        for (const map of maps) {
            await this.downloadMap(map);
        }
    }

    public async downloadMap(filename: string, host = contentSources.maps.http[0]) : Promise<void> {
        if (this.maps[filename]) {
            return;
        }

        try {
            console.log(`Downloading map: ${filename}`);

            const downloadResponse = await axios({
                url: `${host}${filename}`,
                method: "get",
                responseType: "arraybuffer",
                headers: { "Content-Type": "application/7z" },
                adapter: require("axios/lib/adapters/http"),
                onDownloadProgress: (progress) => {
                    this.onMapDlProgress.dispatch({
                        currentBytes: progress.loaded,
                        totalBytes: progress.total
                    });
                }
            });

            if (downloadResponse.status !== 200) {
                throw new Error(downloadResponse.statusText);
            }

            const dest = path.join(this.getMapsPath(), filename);
            await fs.promises.writeFile(dest, Buffer.from(downloadResponse.data), { encoding: "binary" });

            console.log(`Map downloaded successfully: ${filename}`);

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
}