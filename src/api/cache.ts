import * as path from "path";
import * as fs from "fs";
import sqlite3 from "sqlite3";
import { open, Database, Statement } from "sqlite";
import { MapParser } from "spring-map-parser";
import { Ref } from "vue";
import { mapDataToMapSchema } from "bar-db/dist/processors/map-processor";
import { SpringMap } from "bar-db/dist/model/db/spring-map";
import { Signal } from "jaz-ts-utils";

export type MapData = Omit<SpringMap.Schema, "id">;

export interface MapCacheProgress {
    totalMapsToCache: number;
    currentMapsCached: number;
    currentMapCaching: string;
}

export class CacheAPI {
    public onMapCacheProgress: Signal<MapCacheProgress> = new Signal();

    protected verbose = false;
    protected db!: Database<sqlite3.Database, sqlite3.Statement>;
    protected cachedMaps: string[] = [];
    protected preparedStatements: { [key: string]: Statement<sqlite3.Statement> } = {};
    protected parser: MapParser;

    constructor(protected userDataDir: string, protected dataDir: Ref<string>) {
        this.parser = new MapParser({ mipmapSize: 8 });
    }

    public async init() {
        if (this.verbose) {
            sqlite3.verbose();
        }

        this.db = await open({
            filename: path.join(this.userDataDir, "cache.db"),
            driver: sqlite3.Database,
        });

        if (this.verbose) {
            this.db.on("trace", (data: any) => {
                console.log(data);
            });
        }

        await this.db.run("CREATE TABLE IF NOT EXISTS maps (filename TEXT PRIMARY KEY, data TEXT)");

        return this;
    }

    public async cacheMaps(recacheAll = false) {
        const mapFileNames = await fs.promises.readdir(this.getMapsPath());
        const cachedMapFileNames = await this.getCachedMapNames();

        const mapsToCache = mapFileNames.filter(fileName => (recacheAll || !cachedMapFileNames.includes(fileName)) && (fileName.endsWith(".sd7") || fileName.endsWith(".sdz")));

        let mapsCached = 0;
        for (const mapFileName of mapsToCache) {
            this.onMapCacheProgress.dispatch({
                totalMapsToCache: mapsToCache.length,
                currentMapsCached: mapsCached,
                currentMapCaching: mapFileName,
            });

            await this.cacheMap(path.join(this.getMapsPath(), mapFileName));

            mapsCached++;
        }
    }

    public async cacheMap(mapFilePath: string) {
        try {
            const mapData = await this.parser.parseMap(mapFilePath);
            const mapSchema = mapDataToMapSchema(mapData);
            const destPath = (name: string) => path.join(this.getMapImagesPath(), `${mapSchema.fileName}-${name}.png`);

            await mapData.textureMap!.writeAsync(destPath("texture"));
            await mapData.metalMap!.writeAsync(destPath("metal"));
            await mapData.heightMap!.writeAsync(destPath("height"));
            await mapData.typeMap!.writeAsync(destPath("type"));

            const query = await this.prepareStatement("addMap", "REPLACE INTO maps (filename, data) VALUES (?, ?)");
            await query.get(mapSchema.fileNameWithExt, JSON.stringify(mapSchema));
        } catch (err) {
            console.error(`There was an error caching map: ${mapFilePath}`, err);
        }
    }

    public async getCachedMap(mapName: string): Promise<MapData | null> {
        const query = await this.prepareStatement("getMap", "SELECT * FROM maps WHERE filename = ?");
        const map = await query.get(mapName);
        if (!map) {
            return null;
        }
        return JSON.parse(map.data);
    }

    public async getCachedMaps(): Promise<MapData[]> {
        const query = await this.prepareStatement("getMaps", "SELECT * FROM maps");
        const maps = await query.all();
        return maps.map(map => JSON.parse(map.data));
    }

    public async getCachedMapNames(): Promise<string[]> {
        const query = await this.prepareStatement("getMapNames", "SELECT filename FROM maps");
        const maps = await query.all();
        return maps.map(map => map.filename);
    }

    public getMapsPath() {
        return path.join(this.dataDir.value, "maps");
    }

    public getMapImagesPath() {
        return path.join(this.dataDir.value, "map-images");
    }

    protected async prepareStatement(key: string, statement: string) {
        if (this.preparedStatements[key]) {
            return this.preparedStatements[key];
        }

        this.preparedStatements[key] = await this.db.prepare(statement);

        return this.preparedStatements[key];
    }
}