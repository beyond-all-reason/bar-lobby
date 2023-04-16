import * as fs from "fs";
import { asArray, delay, removeFromArray, Signal } from "jaz-ts-utils";
import * as path from "path";
import url from "url";
import { reactive } from "vue";

import { PrDownloaderAPI } from "@/api/content/pr-downloader";
import { MapData } from "@/model/cache/map-data";
import { parseMap as parseMapWorkerFunction } from "@/workers/parse-map";
import { hookWorkerFunction } from "@/workers/worker-helpers";

/**
 * @todo replace queue method with syncMapCache function once prd returns map file name
 */
export class MapContentAPI extends PrDownloaderAPI<MapData> {
    public readonly onMapCached: Signal<MapData> = new Signal();

    protected readonly mapsDir = path.join(api.info.contentPath, "maps");
    protected readonly mapImagesDir = path.join(api.info.contentPath, "map-images");
    protected readonly path7za = path.join(api.info.resourcesPath, process.platform === "win32" ? "7za.exe" : "7za");
    protected readonly parseMap = hookWorkerFunction(new Worker(new URL("../../workers/parse-map.ts", import.meta.url), { type: "module" }), parseMapWorkerFunction);
    protected readonly mapCacheQueue: Set<string> = reactive(new Set());
    protected cachingMaps = false;

    public override async init() {
        await fs.promises.mkdir(this.mapsDir, { recursive: true });

        const maps = await api.cacheDb.selectFrom("map").selectAll().execute();

        this.installedVersions.push(...maps);

        await this.queueMapsToCache();

        this.cacheMaps();

        return super.init();
    }

    public isVersionInstalled(id: string): boolean {
        return this.installedVersions.some((map) => map.scriptName === id);
    }

    public getMapByScriptName(scriptName: string) {
        return this.installedVersions.find((map) => map.scriptName === scriptName);
    }

    public async downloadMaps(scriptNameOrNames: string | string[]) {
        const scriptNames = asArray(scriptNameOrNames);

        for (const scriptName of scriptNames) {
            if (this.installedVersions.some((map) => map.scriptName === scriptName) || this.currentDownloads.some((download) => download.name === scriptName)) {
                continue;
            }

            await this.downloadContent("map", scriptName);

            await this.queueMapsToCache();
        }
    }

    public getMapImages(mapData: MapData | undefined) {
        if (!mapData) {
            return {
                textureImagePath: "/images/default-minimap.png",
                heightImagePath: "/images/default-minimap.png",
                metalImagePath: "/images/default-minimap.png",
                typeImagePath: "/images/default-minimap.png",
            };
        }

        const fileNameWithoutExt = path.parse(mapData.fileName).name;

        return {
            textureImagePath: url.pathToFileURL(path.join(this.mapImagesDir, `${fileNameWithoutExt}-texture.jpg`)).toString(),
            heightImagePath: url.pathToFileURL(path.join(this.mapImagesDir, `${fileNameWithoutExt}-height.jpg`)).toString(),
            metalImagePath: url.pathToFileURL(path.join(this.mapImagesDir, `${fileNameWithoutExt}-metal.jpg`)).toString(),
            typeImagePath: url.pathToFileURL(path.join(this.mapImagesDir, `${fileNameWithoutExt}-type.jpg`)).toString(),
        };
    }

    public async queueMapsToCache() {
        let mapFiles = await fs.promises.readdir(this.mapsDir);
        mapFiles = mapFiles.filter((mapFile) => mapFile.endsWith("sd7"));

        const cachedMapFiles = await api.cacheDb.selectFrom("map").select(["fileName"]).execute();
        const cachedMapFileNames = cachedMapFiles.map((file) => file.fileName);

        const erroredMapFiles = await api.cacheDb.selectFrom("mapError").select(["fileName"]).execute();
        const erroredMapFileNames = erroredMapFiles.map((file) => file.fileName);

        const mapFilesToCache = mapFiles.filter((file) => !cachedMapFileNames.includes(file) && !erroredMapFileNames.includes(file));
        const mapFilesToUncache = cachedMapFileNames.filter((fileName) => !mapFiles.includes(fileName));

        for (const mapFileToCache of mapFilesToCache) {
            this.mapCacheQueue.add(mapFileToCache);
        }

        for (const mapFileToUncache of mapFilesToUncache) {
            await this.uncacheMap(mapFileToUncache);
        }
    }

    public async uninstallVersion(version: MapData) {
        const mapFile = path.join(this.mapsDir, version.fileName);
        await fs.promises.rm(mapFile, { force: true, recursive: true });

        await this.uncacheMap(version.fileName);

        removeFromArray(this.installedVersions, version);
    }

    protected async uncacheMap(fileName: string) {
        const fileNameWithoutExt = path.parse(fileName).name;

        await fs.promises.rm(path.join(this.mapImagesDir, `${fileNameWithoutExt}-texture.jpg`), { force: true });
        await fs.promises.rm(path.join(this.mapImagesDir, `${fileNameWithoutExt}-height.jpg`), { force: true });
        await fs.promises.rm(path.join(this.mapImagesDir, `${fileNameWithoutExt}-metal.jpg`), { force: true });
        await fs.promises.rm(path.join(this.mapImagesDir, `${fileNameWithoutExt}-type.jpg`), { force: true });

        await api.cacheDb.deleteFrom("map").where("fileName", "=", fileName).execute();

        const index = this.installedVersions.findIndex((map) => map.fileName === fileName);
        if (index) {
            this.installedVersions.splice(index, 1);
        }
    }

    protected async cacheMaps() {
        if (this.cachingMaps) {
            console.warn("Don't call cacheMaps more than once");
            return;
        }

        this.cachingMaps = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const [mapToCache] = this.mapCacheQueue;

            if (mapToCache) {
                await this.cacheMap(mapToCache);
            } else {
                await delay(500);
            }
        }
    }

    protected async cacheMap(mapFileName: string) {
        try {
            const fileName = path.parse(mapFileName).name;

            const existingCachedMap = await api.cacheDb.selectFrom("map").select("mapId").where("fileName", "=", fileName).executeTakeFirst();
            if (existingCachedMap || this.installedVersions.some((map) => map.fileName === mapFileName)) {
                console.debug(`${fileName} already cached`);
                this.mapCacheQueue.delete(mapFileName);
                return;
            }

            console.debug(`Caching: ${mapFileName}`);
            console.time(`Cached: ${mapFileName}`);

            const mapPath = path.join(this.mapsDir, mapFileName);

            const parsedMap = await this.parseMap(mapPath, this.mapImagesDir, this.path7za);

            const mapData = await api.cacheDb
                .insertInto("map")
                .values(parsedMap)
                .onConflict((oc) => {
                    const { scriptName, fileName, ...nonUniqueValues } = parsedMap;
                    return oc.doUpdateSet(nonUniqueValues);
                })
                .returningAll()
                .executeTakeFirst();

            if (mapData) {
                this.installedVersions.push(mapData);
                this.onMapCached.dispatch(mapData);
            }

            console.timeEnd(`Cached: ${mapFileName}`);
        } catch (err) {
            console.error(`Error parsing map: ${mapFileName}`, err);

            await api.cacheDb
                .insertInto("mapError")
                .onConflict((oc) => oc.doNothing())
                .values({ fileName: mapFileName })
                .execute();
        }

        this.mapCacheQueue.delete(mapFileName);
    }

    protected mapCached(mapName: string) {
        return new Promise<MapData>((resolve) => {
            this.onMapCached.addOnce((map) => {
                if (map.scriptName === mapName) {
                    resolve(map);
                }
            });
        });
    }

    // currently unused, waiting for prd to return map file name so we know which file to cache
    /** Remove maps from cache that aren't in the filesystem and add maps to cache that are */
    protected async syncMapCache() {
        let mapFiles = await fs.promises.readdir(this.mapsDir);
        mapFiles = mapFiles.filter((mapFile) => mapFile.endsWith("sd7"));

        const cachedMapFiles = await api.cacheDb.selectFrom("map").select(["fileName"]).execute();
        const cachedMapFileNames = cachedMapFiles.map((file) => file.fileName);

        const erroredMapFiles = await api.cacheDb.selectFrom("mapError").select(["fileName"]).execute();
        const erroredMapFileNames = erroredMapFiles.map((file) => file.fileName);

        const mapFilesToCache = mapFiles.filter((file) => !cachedMapFileNames.includes(file) && !erroredMapFileNames.includes(file));
        const mapFilesToUncache = cachedMapFileNames.filter((fileName) => !mapFiles.includes(fileName));

        for (const mapFileToUncache of mapFilesToUncache) {
            await this.uncacheMap(mapFileToUncache);
        }

        for (const mapFileToCache of mapFilesToCache) {
            await this.cacheMap(mapFileToCache);
        }
    }
}
