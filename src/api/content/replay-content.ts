import fs from "fs";
import { delay } from "jaz-ts-utils";
import path from "path";

import { AbstractContentAPI } from "@/api/content/abstract-content-api";
import { parseReplay as parseReplayWorkerFunction } from "@/workers/parse-replay";
import { hookWorkerFunction } from "@/workers/worker-helpers";

export class ReplayContentAPI extends AbstractContentAPI {
    public readonly replaysDir = path.join(api.info.contentPath, "demos");

    protected parseReplay = hookWorkerFunction(new Worker(new URL(`../../workers/parse-replay.ts`, import.meta.url), { type: "module" }), parseReplayWorkerFunction);
    protected replayCacheQueue: Set<string> = new Set();

    public override async init() {
        await fs.promises.mkdir(this.replaysDir, { recursive: true });

        await api.cacheDb.schema
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
            .addColumn("startPosType", "integer", (col) => col.notNull())
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

        await api.cacheDb.schema
            .createTable("replayError")
            .ifNotExists()
            .addColumn("fileName", "varchar", (col) => col.primaryKey())
            .execute();

        await this.queueReplaysToCache();

        fs.watch(this.replaysDir, (watchEvent, filename) => {
            if (watchEvent === "change") {
                this.replayCacheQueue.add(filename);
            }
        });

        this.cacheReplays();

        return super.init();
    }

    public async getReplays(offset = 0, limit = -1) {
        return api.cacheDb.selectFrom("replay").selectAll().orderBy("startTime", "desc").offset(offset).limit(limit).execute();
    }

    public async getReplayById(replayId: number) {
        return api.cacheDb.selectFrom("replay").selectAll().where("replayId", "=", replayId).executeTakeFirstOrThrow();
    }

    public async getTotalReplayCount() {
        const { num_replays } = await api.cacheDb.selectFrom("replay").select(api.cacheDb.fn.count<number>("replayId").as("num_replays")).executeTakeFirstOrThrow();
        return num_replays;
    }

    protected async queueReplaysToCache() {
        const replayFiles = await fs.promises.readdir(this.replaysDir);

        const cachedReplayFiles = await api.cacheDb.selectFrom("replay").select(["fileName"]).execute();
        const cachedReplayFileNames = cachedReplayFiles.map((file) => file.fileName);

        const erroredReplayFiles = await api.cacheDb.selectFrom("replayError").select(["fileName"]).execute();
        const erroredReplayFileNames = erroredReplayFiles.map((file) => file.fileName);

        const replaysFilesToCache = replayFiles.filter((file) => !cachedReplayFileNames.includes(file) && !erroredReplayFileNames.includes(file));

        for (const replayFileToCache of replaysFilesToCache) {
            this.replayCacheQueue.add(replayFileToCache);
        }
    }

    protected async cacheReplays() {
        const [replayToCache] = this.replayCacheQueue;

        if (replayToCache) {
            await this.cacheReplay(replayToCache);
        } else {
            await delay(5000);
        }

        this.cacheReplays();
    }

    protected async cacheReplay(replayFileName: string) {
        try {
            console.debug(`Caching: ${replayFileName}`);
            console.time(`Cached: ${replayFileName}`);

            const replayFilePath = path.join(api.info.contentPath, "demos", replayFileName);

            const replayData = await this.parseReplay(replayFilePath);

            await api.cacheDb.insertInto("replay").values(replayData).execute();

            console.timeEnd(`Cached: ${replayFileName}`);
        } catch (err) {
            console.error(`Error parsing replay: ${replayFileName}`, err);

            await api.cacheDb
                .insertInto("replayError")
                .values({
                    fileName: replayFileName,
                })
                .execute();
        }

        this.replayCacheQueue.delete(replayFileName);
    }
}
