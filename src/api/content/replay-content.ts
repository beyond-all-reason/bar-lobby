import fs from "fs";
import { delay, Optionals } from "jaz-ts-utils";
import path from "path";
import { reactive } from "vue";

import { AbstractContentAPI } from "@/api/content/abstract-content";
import { parseReplay as parseReplayWorkerFunction } from "@/workers/parse-replay";
import { hookWorkerFunction } from "@/workers/worker-helpers";

export type ReplayQueryOptions = {
    offset?: number;
    limit?: number;
    endedNormally?: boolean | null;
};

export const defaultReplayQueryOptions: Optionals<ReplayQueryOptions> = {
    offset: 0,
    limit: -1,
    endedNormally: true,
};
export class ReplayContentAPI extends AbstractContentAPI {
    public readonly replaysDir = path.join(api.info.contentPath, "demos");

    protected readonly parseReplay = hookWorkerFunction(new Worker(new URL(`../../workers/parse-replay.ts`, import.meta.url), { type: "module" }), parseReplayWorkerFunction);
    protected readonly replayCacheQueue: Set<string> = reactive(new Set());
    protected cachingReplays = false;

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

        this.cacheReplays();

        return super.init();
    }

    public async getReplays(optionsArg: ReplayQueryOptions) {
        const options = { ...defaultReplayQueryOptions, ...optionsArg };

        let query = api.cacheDb.selectFrom("replay").selectAll().orderBy("startTime", "desc");

        if (options.endedNormally !== null) {
            query = query.where("gameEndedNormally", "=", options.endedNormally);
        }

        return query.offset(options.offset).limit(options.limit).execute();
    }

    public async getReplayById(replayId: number) {
        return api.cacheDb.selectFrom("replay").selectAll().where("replayId", "=", replayId).executeTakeFirstOrThrow();
    }

    public async getTotalReplayCount() {
        const { num_replays } = await api.cacheDb.selectFrom("replay").select(api.cacheDb.fn.count<number>("replayId").as("num_replays")).executeTakeFirstOrThrow();
        return num_replays;
    }

    public async clearCache() {
        await api.cacheDb.deleteFrom("replay").execute();
        await api.cacheDb.deleteFrom("replayError").execute();
    }

    public async queueReplaysToCache() {
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
        if (this.cachingReplays) {
            console.warn("Don't call cacheReplays more than once");
            return;
        }

        this.cachingReplays = true;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const [replayToCache] = this.replayCacheQueue;

            if (replayToCache) {
                await this.cacheReplay(replayToCache);
            } else {
                await delay(500);
            }
        }
    }

    protected async cacheReplay(replayFileName: string) {
        try {
            console.debug(`Caching: ${replayFileName}`);
            console.time(`Cached: ${replayFileName}`);

            const replayFilePath = path.join(api.info.contentPath, "demos", replayFileName);

            const replayData = await this.parseReplay(replayFilePath);

            await api.cacheDb
                .insertInto("replay")
                .values(replayData)
                .onConflict((oc) => {
                    const { gameId, fileName, ...nonUniqueValues } = replayData;
                    return oc.doUpdateSet(nonUniqueValues);
                })
                .execute();
        } catch (err) {
            console.error(`Error parsing replay: ${replayFileName}`, err);

            await api.cacheDb
                .insertInto("replayError")
                .onConflict((oc) => oc.doNothing())
                .values({ fileName: replayFileName })
                .execute();
        }

        console.timeEnd(`Cached: ${replayFileName}`);

        this.replayCacheQueue.delete(replayFileName);
    }
}
