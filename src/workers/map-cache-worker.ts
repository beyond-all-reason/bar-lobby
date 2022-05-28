import * as fs from "fs";
import { BetterWorker, BetterWorkerHost } from "jaz-ts-utils";
import * as path from "path";
import type { SpringMap, StartPos } from "spring-map-parser";
import { MapParser } from "spring-map-parser";

import type { MapData } from "@/model/map-data";
import { AbstractFileCache } from "@/workers/abstract-file-cache";

class MapCache extends AbstractFileCache<MapData> {
    protected mapImagesDir: string;
    protected parser: MapParser;

    constructor(cacheFilePath: string, dataDir: string) {
        super(cacheFilePath, path.join(dataDir, "maps"), [".sd7", ".sdz"]);

        this.mapImagesDir = path.join(dataDir, "map-images");

        this.parser = new MapParser({
            mipmapSize: 8,
            path7za: process.platform === "win32" ? "resources/7za.exe" : "resources/7za",
        });
    }

    public async cacheItem(itemFilePath: string) {
        const fileName = path.parse(itemFilePath).base;
        console.log(`Caching map: ${fileName}`);
        try {
            const map = await this.parser.parseMap(itemFilePath);
            const mapData = this.parseMapData(map);

            mapData.textureImagePath = path.join(this.mapImagesDir, `${mapData.fileName}-texture.jpg`).replace(/\\/g, "/");
            mapData.metalImagePath = path.join(this.mapImagesDir, `${mapData.fileName}-metal.jpg`).replace(/\\/g, "/");
            mapData.heightImagePath = path.join(this.mapImagesDir, `${mapData.fileName}-height.jpg`).replace(/\\/g, "/");
            mapData.typeImagePath = path.join(this.mapImagesDir, `${mapData.fileName}-type.jpg`).replace(/\\/g, "/");

            await map.textureMap!.quality(80).writeAsync(mapData.textureImagePath);
            await map.metalMap.quality(80).writeAsync(mapData.metalImagePath);
            await map.heightMap.quality(80).writeAsync(mapData.heightImagePath);
            await map.typeMap.quality(80).writeAsync(mapData.typeImagePath);

            this.items[mapData.fileNameWithExt] = mapData;

            await this.saveCachedItems();

            console.log(`Cached map: ${fileName}`);
        } catch (err) {
            console.warn(`Error caching map: ${fileName}`, err);
            throw err;
        }
    }

    public async clearItemFromCache(filename: string) {
        const map = this.items[filename];
        if (!map) {
            return;
        }
        for (const imagePath of [map.textureImagePath, map.metalImagePath, map.heightImagePath, map.typeImagePath]) {
            if (imagePath && fs.existsSync(imagePath)) {
                await fs.promises.rm(imagePath);
            }
        }
        delete this.items[filename];
        await this.saveCachedItems();
    }

    protected parseMapData(mapData: SpringMap): MapData {
        return {
            fileName: mapData.fileName,
            fileNameWithExt: mapData.fileNameWithExt,
            scriptName: mapData.scriptName.trim(),
            friendlyName: mapData.scriptName.trim().replace(/[_-]/g, " "),
            description: mapData.mapInfo?.description || mapData.smd?.description || "",
            mapHardness: mapData.mapInfo?.maphardness ?? mapData.smd?.mapHardness!,
            gravity: mapData.mapInfo?.gravity ?? mapData.smd?.gravity!,
            tidalStrength: mapData.mapInfo?.tidalStrength ?? mapData.smd?.tidalStrength!,
            maxMetal: mapData.mapInfo?.maxMetal ?? mapData.smd?.maxMetal!,
            extractorRadius: mapData.mapInfo?.extractorRadius ?? mapData.smd?.extractorRadius!,
            minWind: mapData.mapInfo?.atmosphere?.minWind ?? mapData.smd?.minWind!,
            maxWind: mapData.mapInfo?.atmosphere?.maxWind ?? mapData.smd?.maxWind!,
            startPositions: (mapData.mapInfo?.teams?.map((obj) => obj!.startPos) ?? mapData.smd?.startPositions) as Array<StartPos>,
            width: mapData.smf!.mapWidthUnits * 2,
            height: mapData.smf!.mapHeightUnits * 2,
            minDepth: mapData.minHeight,
            maxDepth: mapData.maxHeight,
            mapInfo: mapData.mapInfo,
        };
    }
}

export class MapCacheWorkerHost extends BetterWorkerHost {
    constructor(worker: Worker) {
        super(worker);
    }

    public async init(mapCacheArgs: ConstructorParameters<typeof MapCache>) {
        this.send("init", mapCacheArgs);

        return this;
    }

    public async cacheItems() {
        await this.invoke("cache-maps");
    }

    public async cacheItem(filename: string) {
        await this.invoke("cache-map", filename);
    }

    public async clearItem(filename: string) {
        await this.invoke("clear-map", filename);
    }
}

const worker = new BetterWorker();
let mapCache: MapCache;

// TODO: make a cleaner way of doing this that enforces sent data types
worker.on("init").addOnce(async (data: ConstructorParameters<typeof MapCache>) => {
    mapCache = new MapCache(...data);

    mapCache.onItemsCacheStart.add((data) => worker.send("items-cache-start", data));
    mapCache.onItemsCacheFinish.add((data) => worker.send("items-cache-finish", data));
    mapCache.onItemCacheStart.add((data) => worker.send("item-cache-start", data));
    mapCache.onItemCacheFinish.add((data) => worker.send("item-cache-finish", data));
    mapCache.onCacheLoaded.add((data) => worker.send("item-cache-loaded", data));
    mapCache.onCacheSaved.add((data) => worker.send("item-cache-saved", data));

    await mapCache.init();
});

worker.on("cache-maps").add(async () => {
    await mapCache.cacheItems();
});

worker.on("cache-map").add(async (filename: string) => {
    try {
        await mapCache.cacheItem(filename);
    } catch (err) {
        console.warn(err);
    }
});

worker.on("clear-map").add(async (filename: string) => {
    await mapCache.clearItemFromCache(filename);
});
