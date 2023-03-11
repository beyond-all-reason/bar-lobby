import * as fs from "fs";
import { asArray, delay, Signal } from "jaz-ts-utils";
import * as path from "path";
import url from "url";
import { reactive } from "vue";

import { PrDownloaderAPI } from "@/api/content/pr-downloader";
import defaultMapImage from "@/assets/images/default-minimap.png";
import type { MapData } from "@/model/map-data";
import { parseMap as parseMapWorkerFunction } from "@/workers/parse-map";
import { hookWorkerFunction } from "@/workers/worker-helpers";

export class MapContentAPI extends PrDownloaderAPI {
    public readonly installedMaps: MapData[] = reactive([]);
    public readonly onMapCached: Signal<MapData> = new Signal();

    protected readonly mapsDir = path.join(api.info.contentPath, "maps");
    protected readonly mapImagesDir = path.join(api.info.contentPath, "map-images");
    protected readonly path7za = path.join(api.info.resourcesPath, process.platform === "win32" ? "7za.exe" : "7za");
    protected readonly parseMap = hookWorkerFunction(new Worker(new URL("../../workers/parse-map.ts", import.meta.url), { type: "module" }), parseMapWorkerFunction);
    protected readonly mapCacheQueue: Set<string> = reactive(new Set());
    protected cachingMaps = false;

    public override async init() {
        await fs.promises.mkdir(this.mapsDir, { recursive: true });

        await api.cacheDb.schema
            .createTable("map")
            .ifNotExists()
            .addColumn("mapId", "integer", (col) => col.primaryKey().autoIncrement())
            .addColumn("scriptName", "varchar", (col) => col.notNull().unique())
            .addColumn("fileName", "varchar", (col) => col.notNull().unique())
            .addColumn("friendlyName", "varchar", (col) => col.notNull())
            .addColumn("description", "varchar", (col) => col)
            .addColumn("mapHardness", "double precision", (col) => col.notNull())
            .addColumn("gravity", "double precision", (col) => col.notNull())
            .addColumn("tidalStrength", "double precision", (col) => col.notNull())
            .addColumn("maxMetal", "double precision", (col) => col.notNull())
            .addColumn("extractorRadius", "double precision", (col) => col.notNull())
            .addColumn("minWind", "double precision", (col) => col.notNull())
            .addColumn("maxWind", "double precision", (col) => col.notNull())
            .addColumn("startPositions", "json", (col) => col)
            .addColumn("width", "double precision", (col) => col.notNull())
            .addColumn("height", "double precision", (col) => col.notNull())
            .addColumn("minDepth", "double precision", (col) => col.notNull())
            .addColumn("maxDepth", "double precision", (col) => col.notNull())
            .addColumn("mapInfo", "json", (col) => col)
            .execute();

        await api.cacheDb.schema
            .createTable("mapError")
            .ifNotExists()
            .addColumn("fileName", "varchar", (col) => col.primaryKey())
            .execute();

        const maps = await api.cacheDb.selectFrom("map").selectAll().execute();

        this.installedMaps.length = 0;
        this.installedMaps.push(...maps);

        await this.queueMapsToCache();

        this.cacheMaps();

        return super.init();
    }

    public getMapByScriptName(scriptName: string) {
        return this.installedMaps.find((map) => map.scriptName === scriptName);
    }

    public async downloadMaps(scriptNameOrNames: string | string[]) {
        const scriptNames = asArray(scriptNameOrNames);

        for (const scriptName of scriptNames) {
            if (this.installedMaps.some((map) => map.scriptName === scriptName) || this.currentDownloads.some((download) => download.name === scriptName)) {
                continue;
            }

            await this.downloadContent("map", scriptName);

            await this.queueMapsToCache();
        }
    }

    public getMapImages(mapData: MapData | undefined) {
        if (!mapData) {
            return {
                textureImagePath: defaultMapImage as string,
                heightImagePath: defaultMapImage as string,
                metalImagePath: defaultMapImage as string,
                typeImagePath: defaultMapImage as string,
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

        for (const mapFileToCache of mapFilesToCache) {
            this.mapCacheQueue.add(mapFileToCache);
        }
    }

    public async uninstallMap(mapScriptName: string) {
        const mapData = this.installedMaps.find((map) => map.scriptName === mapScriptName);
        if (mapData) {
            const mapPath = path.join(this.mapsDir, mapData.fileName);
            await fs.promises.rm(mapPath);

            console.debug(`${mapScriptName} successfully uninstalled`);
        }
    }

    public async clearCache() {
        await api.cacheDb.deleteFrom("map").execute();
        await api.cacheDb.deleteFrom("mapError").execute();
    }

    protected async cacheMaps() {
        if (this.cachingMaps) {
            console.warn("Don't call cacheReplays more than once");
            return;
        }

        this.cachingMaps = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const [replayToCache] = this.mapCacheQueue;

            if (replayToCache) {
                await this.cacheMap(replayToCache);
            } else {
                await delay(500);
            }
        }
    }

    protected async cacheMap(mapFileName: string) {
        try {
            const fileName = path.parse(mapFileName).name;

            const existingCachedMap = await api.cacheDb.selectFrom("map").select("mapId").where("fileName", "=", fileName).executeTakeFirst();
            if (existingCachedMap || this.installedMaps.some((map) => map.fileName === mapFileName)) {
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
                this.installedMaps.push(mapData);
                this.onMapCached.dispatch(mapData);
            }
        } catch (err) {
            console.error(`Error parsing map: ${mapFileName}`, err);

            await api.cacheDb
                .insertInto("mapError")
                .onConflict((oc) => oc.doNothing())
                .values({ fileName: mapFileName })
                .execute();
        }

        console.timeEnd(`Cached: ${mapFileName}`);

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

    protected async uncacheMap(mapData: MapData) {
        const map = await api.cacheDb.selectFrom("map").selectAll().where("scriptName", "=", mapData.scriptName).executeTakeFirst();

        if (!map) {
            return;
        }

        const mapImages = this.getMapImages(map);

        if (mapImages) {
            await fs.promises.rm(mapImages.textureImagePath, { force: true });
            await fs.promises.rm(mapImages.heightImagePath, { force: true });
            await fs.promises.rm(mapImages.metalImagePath, { force: true });
            await fs.promises.rm(mapImages.typeImagePath, { force: true });

            await api.cacheDb.deleteFrom("map").where("mapId", "=", map.mapId).execute();
        }
    }
}
