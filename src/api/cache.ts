import * as path from "path";
import * as fs from "fs";
import sqlite3 from "sqlite3";
import { open, Database, Statement } from "sqlite";
import { MapParser } from "spring-map-parser";
import { Ref } from "vue";
import { mapDataToMapSchema } from "bar-db/dist/processors/map-processor";
import { SpringMap } from "bar-db/dist/model/db/spring-map";
import { ipcMain } from "electron";

export type MapData = Omit<SpringMap.Schema, "id">;

export interface MapCacheProgress {
    totalMapsToCache: number;
    currentMapsCached: number;
    currentMapCaching: string;
}

export class CacheAPI {
    protected verbose = false;
    protected db!: Database<sqlite3.Database, sqlite3.Statement>;
    protected cachedMaps: { [filename: string]: MapData } = {};
    protected preparedStatements: { [key: string]: Statement<sqlite3.Statement> } = {};
    protected parser: MapParser;

    constructor(protected userDataDir: string, protected dataDir: Ref<string>) {
        this.parser = new MapParser({
            mipmapSize: 8,
            path7za: process.platform === "win32" ? "extra_resources/7za.exe" : "extra_resources/7za"
        });
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

        const query = await this.prepareStatement("getMaps", "SELECT * FROM maps");
        const maps = await query.all();
        maps.forEach(map => {
            const mapData: MapData = JSON.parse(map.data);
            this.cachedMaps[map.filename] = mapData;
        });

        ipcMain.handle("getCachedMaps", async (event) => this.cachedMaps);
        ipcMain.handle("getCachedMap", async (event, filename: string) => this.cachedMaps[filename]);

        // this.cacheMaps();

        return this;
    }

    // TODO: setup dir watch to call this when map dir changes
    public async cacheMaps(recacheAll = false) {
        const mapFileNames = await fs.promises.readdir(this.getMapsPath());
        const cachedMapFileNames = Object.keys(this.cachedMaps);

        const mapsToCache = mapFileNames.filter(fileName => (recacheAll || !cachedMapFileNames.includes(fileName)) && (fileName.endsWith(".sd7") || fileName.endsWith(".sdz")));

        let mapsCached = 0;
        for (const mapFileName of mapsToCache) {
            ipcMain.emit("map-cache-progress", {
                totalMapsToCache: mapsToCache.length,
                currentMapsCached: mapsCached,
                currentMapCaching: mapFileName,
            });

            await this.cacheMap(path.join(this.getMapsPath(), mapFileName));

            mapsCached++;
        }
    }

    protected async cacheMap(mapFilePath: string) {
        try {
            const mapData = await this.parser.parseMap(mapFilePath);
            const mapSchema = mapDataToMapSchema(mapData);
            const destPath = (name: string) => path.join(this.getMapImagesPath(), `${mapSchema.fileName}-${name}.png`);

            await mapData.textureMap!.writeAsync(destPath("texture"));
            await mapData.metalMap!.writeAsync(destPath("metal"));
            await mapData.heightMap!.writeAsync(destPath("height"));
            await mapData.typeMap!.writeAsync(destPath("type"));

            const query = await this.prepareStatement("addMap", "REPLACE INTO maps (filename, data) VALUES (?, ?)");
            await query.get(mapSchema.fileNameWithExt!, JSON.stringify(mapSchema));

            this.cachedMaps[mapSchema.fileNameWithExt!] = mapSchema;

            ipcMain.emit("map-cached", mapSchema);
        } catch (err) {
            console.error(`There was an error caching map: ${mapFilePath}`, err);
        }
    }

    protected getMapsPath() {
        return path.join(this.dataDir.value, "maps");
    }

    protected getMapImagesPath() {
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