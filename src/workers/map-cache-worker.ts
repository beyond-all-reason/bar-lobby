import * as path from "path";
import { MapParser, SpringMap, StartPos } from "spring-map-parser";
import { MapData } from "@/model/map";
import { AbstractFileCache } from "@/workers/abstract-file-cache";
import { BetterWorker, BetterWorkerHost } from "@/utils/better-worker";

class MapCache extends AbstractFileCache<MapData> {
    protected mapImagesDir: string;
    protected parser: MapParser;

    constructor(cacheFilePath: string, dataDir: string) {
        super(cacheFilePath, path.join(dataDir, "maps"), [".sd7", ".sdz"]);

        this.mapImagesDir = path.join(dataDir, "map-images");

        this.parser = new MapParser({
            mipmapSize: 8,
            path7za: process.platform === "win32" ? "extra_resources/7za.exe" : "extra_resources/7za"
        });
    }

    protected async cacheItem(itemFilePath: string) {
        const map = await this.parser.parseMap(itemFilePath);
        const mapData = this.parseMapData(map);
        const destPath = (name: string) => path.join(this.mapImagesDir, `${mapData.fileName}-${name}.png`);

        await map.textureMap!.writeAsync(destPath("texture"));
        await map.metalMap!.writeAsync(destPath("metal"));
        await map.heightMap!.writeAsync(destPath("height"));
        await map.typeMap!.writeAsync(destPath("type"));

        return {
            key: mapData.fileNameWithExt,
            value: mapData
        };
    }

    protected parseMapData(mapData: SpringMap) : MapData {
        return {
            fileName: mapData.fileName,
            fileNameWithExt: mapData.fileNameWithExt,
            scriptName: mapData.scriptName.trim(),
            description: mapData.mapInfo?.description || mapData.smd?.description,
            mapHardness: mapData.mapInfo?.maphardness ?? mapData.smd?.mapHardness!,
            gravity: mapData.mapInfo?.gravity ?? mapData.smd?.gravity!,
            tidalStrength: mapData.mapInfo?.tidalStrength ?? mapData.smd?.tidalStrength!,
            maxMetal: mapData.mapInfo?.maxMetal ?? mapData.smd?.maxMetal!,
            extractorRadius: mapData.mapInfo?.extractorRadius ?? mapData.smd?.extractorRadius!,
            minWind: mapData.mapInfo?.atmosphere?.minWind ?? mapData.smd?.minWind!,
            maxWind: mapData.mapInfo?.atmosphere?.maxWind ?? mapData.smd?.maxWind!,
            startPositions: (mapData.mapInfo?.teams?.map(obj => obj!.startPos) ?? mapData.smd?.startPositions) as Array<StartPos>,
            width: mapData.smf!.mapWidthUnits * 2,
            height: mapData.smf!.mapHeightUnits * 2,
            minDepth: mapData.minHeight,
            maxDepth: mapData.maxHeight,
            mapInfo: mapData.mapInfo
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
}

const worker = new BetterWorker();

// TODO: make a cleaner way of doing this that enforces sent data types
worker.on("init").addOnce(async (data: ConstructorParameters<typeof MapCache>) => {
    const mapCache = await new MapCache(...data).init();

    mapCache.onItemsCacheStart.add((data) => worker.send("items-cache-start", data));
    mapCache.onItemsCacheFinish.add((data) => worker.send("items-cache-finish", data));
    mapCache.onItemCacheStart.add((data) => worker.send("item-cache-start", data));
    mapCache.onItemCacheFinish.add((data) => worker.send("item-cache-finish", data));
    mapCache.onCacheLoaded.add((data) => worker.send("item-cache-loaded", data));
    mapCache.onCacheSaved.add((data) => worker.send("item-cache-saved", data));
});