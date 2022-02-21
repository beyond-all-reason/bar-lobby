import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { AbstractContentAPI } from "@/api/content/abstract-content";
import { MapData } from "@/model/map-data";
import { MapCacheWorkerHost } from "@/workers/map-cache-worker";
import { contentSources } from "@/config/content-sources";
import { Signal } from "jaz-ts-utils";

export class MapContentAPI extends AbstractContentAPI {
    public onDlProgress: Signal<{ currentBytes: number; totalBytes: number }> = new Signal();

    protected maps: Readonly<Record<string, MapData>> = {};
    protected mapCache?: MapCacheWorkerHost;

    constructor(userDataDir: string, dataDir: string) {
        super(userDataDir, dataDir);

        this.mapCache = new MapCacheWorkerHost(new Worker(new URL("../../workers/map-cache-worker.ts", import.meta.url), { type: "module" }));

        this.mapCache.on("item-cache-loaded").add((maps: Record<string, MapData>) => {
            this.maps = Object.freeze(maps);
        });

        this.mapCache.on("item-cache-saved").add((maps: Record<string, MapData>) => {
            this.maps = Object.freeze(maps);
        });
    }

    public async init() {
        const cacheStoreDir = path.join(this.userDataDir, "store");
        const mapCacheFile = path.join(cacheStoreDir, "map-cache.json");

        await this.mapCache?.init([ mapCacheFile, this.dataDir ]);

        return this;
    }

    public getMaps() : { [filename: string]: MapData; } {
        return this.maps;
    }

    public getMapByFilename(filename: string) : MapData | undefined {
        return this.maps[filename];
    }

    public getMapByScriptName(scriptName: string) : MapData | undefined {
        return Object.values(this.maps).find((map) => map.scriptName === scriptName);
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

    public async downloadMap(filename: string, host = contentSources.maps.http[0]) : Promise<void> {
        try {
            const downloadResponse = await axios({
                url: `${host}${filename}`,
                method: "get",
                responseType: "arraybuffer",
                headers: { "Content-Type": "application/7z" },
                adapter: require("axios/lib/adapters/http"),
                onDownloadProgress: (progress) => {
                    this.onDlProgress.dispatch({
                        currentBytes: progress.loaded,
                        totalBytes: progress.total
                    });
                }
            });

            if (downloadResponse.status === 200) {
                throw new Error(downloadResponse.statusText);
            }

            const dest = path.join(this.getMapsPath(), filename);
            await fs.promises.writeFile(dest, Buffer.from(downloadResponse.data), { encoding: "binary" });
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