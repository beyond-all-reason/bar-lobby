import * as path from "path";
import * as fs from "fs";
import sqlite3 from "sqlite3";
import { open, Database, Statement } from "sqlite";

export class CacheAPI {
    protected db!: Database<sqlite3.Database, sqlite3.Statement>;
    protected cachedMaps: string[] = [];
    protected preparedStatements: { [key: string]: Statement<sqlite3.Statement> } = {};

    public async init() {
        this.db = await open({
            filename: path.join(window.info.userDataPath, "cache.db"),
            driver: sqlite3.Database
        });

        return this;
    }

    public async getMap(mapName: string) {
        const query = await this.prepareStatement("getMap", "SELECT * FROM maps WHERE name = ?");
        const map = await query.get(mapName);
        if (!map) {
            return undefined;
        }
        return map;
    }

    protected async getCachedMapNames() : Promise<string[]> {
        return [];
    }

    protected async cacheMaps() {
        const mapFileNames = await fs.promises.readdir(this.getMapsPath());
        const cachedMapFileNames = await this.getCachedMapNames();

        for (const mapFileName of mapFileNames) {
            if (cachedMapFileNames.includes(mapFileName)) {
                continue;
            }

            await this.cacheMap(path.join(this.getMapsPath(), mapFileName));
        }
    }

    protected async cacheMap(mapFilePath: string) {
        console.log(mapFilePath);
    }

    protected getMapsPath() {
        return path.join(window.api.settings.model.dataDir.value, "maps");
    }

    protected async prepareStatement(key: string, statement: string) {
        if (this.preparedStatements[key]) {
            return this.preparedStatements[key];
        }

        this.preparedStatements[key] = await this.db.prepare(statement);

        return this.preparedStatements[key];
    }
}