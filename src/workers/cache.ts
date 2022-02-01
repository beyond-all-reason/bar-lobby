import * as path from "path";
import * as fs from "fs";
import sqlite3 from "sqlite3";
import { Database, Statement } from "sqlite";
import { MapParser, SpringMap, StartPos } from "spring-map-parser";
import { MapData } from "@/model/map";

console.log(sqlite3);

export interface MapCacheProgress {
    totalMapsToCache: number;
    currentMapsCached: number;
    currentMapCaching: string;
}

export class CacheWorker {
    protected userDataDir!: string;
    protected dataDir!: string;
    protected verbose = false;
    protected db!: Database<sqlite3.Database, sqlite3.Statement>;
    protected cachedMaps: { [filename: string]: MapData } = {};
    protected preparedStatements: { [key: string]: Statement<sqlite3.Statement> } = {};
    protected parser: MapParser;

    constructor() {
        //super();

        this.parser = new MapParser({
            mipmapSize: 8,
            path7za: process.platform === "win32" ? "extra_resources/7za.exe" : "extra_resources/7za"
        });

        // this.on("init").addOnce(({ userDataDir, dataDir }) => {
        //     this.init(userDataDir, dataDir);
        // });
    }

    public async init(userDataDir: string, dataDir: string) {
        this.userDataDir = userDataDir;
        this.dataDir = dataDir;

        const map = await this.cacheMap("C:/Users/jaspe/Documents/My Games/Spring/maps/comet_catcher_remake_1.8.sd7");
        console.log(map);

        // if (this.verbose) {
        //     sqlite3.verbose();
        // }

        // this.db = await open({
        //     filename: path.join(this.userDataDir, "cache.db"),
        //     driver: sqlite3.Database,
        // });

        // if (this.verbose) {
        //     this.db.on("trace", (data: any) => {
        //         console.log(data);
        //     });
        // }

        // await this.db.run("CREATE TABLE IF NOT EXISTS maps (filename TEXT PRIMARY KEY, data TEXT)");

        // const query = await this.prepareStatement("getMaps", "SELECT * FROM maps");
        // const maps = await query.all();
        // maps.forEach(map => {
        //     const mapData: MapData = JSON.parse(map.data);
        //     this.cachedMaps[map.filename] = mapData;
        // });

        // console.log("cache worker initialised");

        //addEventListener("getCachedMaps", (event) => this.cachedMaps);
        //addEventListener("getCachedMap", (event, filename: string) => this.cachedMaps[filename]);

        //this.cacheMaps();

        return this;
    }

    // TODO: setup dir watch to call this when map dir changes
    public async cacheMaps(recacheAll = false) {
        const mapFileNames = await fs.promises.readdir(this.getMapsPath());
        const cachedMapFileNames = Object.keys(this.cachedMaps);

        const mapsToCache = mapFileNames.filter(fileName => (recacheAll || !cachedMapFileNames.includes(fileName)) && (fileName.endsWith(".sd7") || fileName.endsWith(".sdz")));

        let mapsCached = 0;
        for (const mapFileName of mapsToCache) {
            // this.sendMessage("cache-progress",  {
            //     totalMapsToCache: mapsToCache.length,
            //     currentMapsCached: mapsCached,
            //     currentMapCaching: mapFileName,
            // });

            await this.cacheMap(path.join(this.getMapsPath(), mapFileName));

            mapsCached++;
        }
    }

    protected async cacheMap(mapFilePath: string) {
        try {
            const map = await this.parser.parseMap(mapFilePath);
            const mapData = this.parseMapData(map);
            const destPath = (name: string) => path.join(this.getMapImagesPath(), `${mapData.fileName}-${name}.png`);

            await map.textureMap!.writeAsync(destPath("texture"));
            await map.metalMap!.writeAsync(destPath("metal"));
            await map.heightMap!.writeAsync(destPath("height"));
            await map.typeMap!.writeAsync(destPath("type"));

            const query = await this.prepareStatement("addMap", "REPLACE INTO maps (filename, data) VALUES (?, ?)");
            await query.get(mapData.fileNameWithExt!, JSON.stringify(mapData));

            this.cachedMaps[mapData.fileNameWithExt!] = mapData;

            return mapData;

            //this.sendMessage("map-cached", mapData);
        } catch (err) {
            console.error(`There was an error caching map: ${mapFilePath}`, err);
        }
    }

    protected getMapsPath() {
        return path.join(this.dataDir, "maps");
    }

    protected getMapImagesPath() {
        return path.join(this.dataDir, "map-images");
    }

    protected async prepareStatement(key: string, statement: string) {
        if (this.preparedStatements[key]) {
            return this.preparedStatements[key];
        }

        this.preparedStatements[key] = await this.db.prepare(statement);

        return this.preparedStatements[key];
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

//new CacheWorker();