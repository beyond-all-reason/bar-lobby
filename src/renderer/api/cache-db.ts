import Database from "better-sqlite3";
import { Kysely, Migration, Migrator, SqliteDialect } from "kysely";
import path from "path";

import { EngineVersionTable } from "@/model/cache/engine-version";
import { GameVersionTable } from "@/model/cache/game-version";
import { MapDataTable } from "@/model/cache/map-data";
import { ReplayTable } from "@/model/cache/replay";
import { SerializePlugin } from "@/utils/serialize-plugin";

type CacheDatabase = {
    map: MapDataTable;
    mapError: { fileName: string };
    replay: ReplayTable;
    replayError: { fileName: string };
    gameVersion: GameVersionTable;
    engineVersion: EngineVersionTable;
};

export class CacheDbAPI extends Kysely<CacheDatabase> {
    protected migrator: Migrator;
    protected serializePlugin;

    constructor() {
        const serializePlugin = new SerializePlugin();

        // const thing = import.meta.resolve("better-sqlite3/build/Release/better_sqlite3.node");
        // console.log(thing);

        super({
            dialect: new SqliteDialect({
                database: new Database(path.join(api.info.configPath, "cache.db"), {
                    //nativeBinding: thing,
                }),
            }),
            plugins: [serializePlugin],
        });

        this.serializePlugin = serializePlugin;

        this.migrator = new Migrator({
            db: this,
            provider: {
                getMigrations: async () => {
                    return this.migrations();
                },
            },
        });
    }

    public async init() {
        await this.schema
            .createTable("map")
            .ifNotExists()
            .addColumn("mapId", "integer", (col) => col.primaryKey().autoIncrement())
            .addColumn("scriptName", "varchar", (col) => col.notNull().unique())
            .addColumn("fileName", "varchar", (col) => col.notNull().unique())
            .addColumn("friendlyName", "varchar", (col) => col.notNull())
            .addColumn("description", "varchar")
            .addColumn("mapHardness", "double precision", (col) => col.notNull())
            .addColumn("gravity", "double precision", (col) => col.notNull())
            .addColumn("tidalStrength", "double precision", (col) => col.notNull())
            .addColumn("maxMetal", "double precision", (col) => col.notNull())
            .addColumn("extractorRadius", "double precision", (col) => col.notNull())
            .addColumn("minWind", "double precision", (col) => col.notNull())
            .addColumn("maxWind", "double precision", (col) => col.notNull())
            .addColumn("startPositions", "json")
            .addColumn("width", "double precision", (col) => col.notNull())
            .addColumn("height", "double precision", (col) => col.notNull())
            .addColumn("minDepth", "double precision", (col) => col.notNull())
            .addColumn("maxDepth", "double precision", (col) => col.notNull())
            .addColumn("mapInfo", "json")
            .execute();

        await this.schema
            .createTable("mapError")
            .ifNotExists()
            .addColumn("fileName", "varchar", (col) => col.primaryKey())
            .execute();

        await this.schema
            .createTable("gameVersion")
            .ifNotExists()
            .addColumn("id", "varchar", (col) => col.primaryKey())
            .addColumn("md5", "varchar")
            .addColumn("lastLaunched", "datetime", (col) => col.notNull())
            .execute();

        await this.schema
            .createTable("engineVersion")
            .ifNotExists()
            .addColumn("id", "varchar", (col) => col.primaryKey())
            .addColumn("lastLaunched", "datetime", (col) => col.notNull())
            .execute();

        await this.schema
            .createTable("replay")
            .ifNotExists()
            .addColumn("replayId", "integer", (col) => col.primaryKey().autoIncrement())
            .addColumn("gameId", "varchar", (col) => col.notNull().unique())
            .addColumn("fileName", "varchar", (col) => col.notNull().unique())
            .addColumn("engineVersion", "varchar", (col) => col.notNull())
            .addColumn("gameVersion", "varchar", (col) => col.notNull())
            .addColumn("mapScriptName", "varchar", (col) => col.notNull())
            .addColumn("startTime", "datetime", (col) => col.notNull())
            .addColumn("gameDurationMs", "integer", (col) => col.notNull())
            .addColumn("gameEndedNormally", "boolean", (col) => col.notNull())
            .addColumn("chatlog", "json", (col) => col)
            .addColumn("hasBots", "boolean", (col) => col.notNull())
            .addColumn("preset", "varchar", (col) => col.notNull())
            .addColumn("winningTeamId", "integer", (col) => col)
            .addColumn("teams", "json", (col) => col.notNull())
            .addColumn("contenders", "json", (col) => col.notNull())
            .addColumn("spectators", "json", (col) => col.notNull())
            .addColumn("script", "text", (col) => col.notNull())
            .addColumn("battleSettings", "json", (col) => col.notNull())
            .addColumn("gameSettings", "json", (col) => col.notNull())
            .addColumn("mapSettings", "json", (col) => col.notNull())
            .addColumn("hostSettings", "json", (col) => col.notNull())
            .execute();

        await this.schema
            .createTable("replayError")
            .ifNotExists()
            .addColumn("fileName", "varchar", (col) => col.primaryKey())
            .execute();

        await this.serializePlugin.setSchema(this); //might be needed already for migration

        await this.migrateToLatest();

        await this.serializePlugin.setSchema(this); //again in case migration changed the database

        return this;
    }

    // https://github.com/kysely-org/kysely#migrations
    protected migrations(): Record<string, Migration> {
        return {
            // yyyy-mm-dd
            "2023-04-10": {
                async up(db) {
                    await db.schema
                        .alterTable("map")
                        .addColumn("lastLaunched", "datetime", (col) => col.notNull())
                        .execute();
                },
            },
            "2023-04-15": {
                async up(db) {
                    await db.schema.dropTable("game_versions").ifExists().execute();
                    await db.deleteFrom("engineVersion").execute();
                    await db.deleteFrom("gameVersion").execute();

                    await db.schema
                        .alterTable("engineVersion")
                        .addColumn("ais", "json", (col) => col.notNull())
                        .execute();
                    await db.schema
                        .alterTable("gameVersion")
                        .addColumn("ais", "json", (col) => col.notNull())
                        .execute();
                },
            },
            "2023-06-20": {
                async up(db) {
                    await db.schema
                        .alterTable("replay")
                        .addColumn("filePath", "varchar", (col) => col)
                        .execute();
                },
            },
        };
    }

    protected async migrateToLatest() {
        const { error, results } = await this.migrator.migrateToLatest();

        results?.forEach((it) => {
            if (it.status === "Success") {
                console.log(`migration "${it.migrationName}" was executed successfully`);
            } else if (it.status === "Error") {
                console.error(`failed to execute migration "${it.migrationName}"`);
            }
        });

        if (error) {
            console.error("failed to run `migrateToLatest`");
            console.error(error);
        }
    }
}
