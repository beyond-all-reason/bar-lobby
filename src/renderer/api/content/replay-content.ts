import fs from "fs";
import { delay, Optionals, Signal } from "jaz-ts-utils";
import path from "path";
import { reactive } from "vue";

import { Replay } from "@/model/cache/replay";
import { isFileInUse } from "@/utils/misc";
import { parseReplay as parseReplayWorkerFunction } from "@/workers/parse-replay";
import { hookWorkerFunction } from "@/workers/worker-helpers";

export type ReplayQueryOptions = {
    offset?: number;
    limit?: number;
    endedNormally?: boolean | null;
    sortField?: keyof Replay | null;
    sortOrder?: "asc" | "desc";
};

export const defaultReplayQueryOptions: Optionals<ReplayQueryOptions> = {
    offset: 0,
    limit: -1,
    endedNormally: true,
    sortField: null,
    sortOrder: "asc",
};

export class ReplayContentAPI {
    public readonly replaysDir = path.join(api.info.contentPath, "demos");
    public readonly onReplayCached = new Signal();

    protected readonly parseReplay = hookWorkerFunction(new Worker(new URL(`../../workers/parse-replay.ts`, import.meta.url), { type: "module" }), parseReplayWorkerFunction);
    protected readonly replayCacheQueue: Set<string> = reactive(new Set());
    protected cachingReplays = false;

    public async init() {
        await fs.promises.mkdir(this.replaysDir, { recursive: true });

        await this.queueReplaysToCache();

        this.cacheReplays();

        return this;
    }

    public async getReplays(optionsArg: ReplayQueryOptions) {
        const options = { ...defaultReplayQueryOptions, ...optionsArg };

        let query = api.cacheDb.selectFrom("replay").selectAll();

        if (options.endedNormally !== null) {
            query = query.where("gameEndedNormally", "=", options.endedNormally);
        }

        if (options.sortField !== null) {
            query = query.orderBy(options.sortField, options.sortOrder);
        }

        return query.offset(options.offset).limit(options.limit).execute();
    }

    public async parseAndLaunchReplay(replayPath: string) {
        const replay = await this.parseReplay(replayPath);
        api.game.launch((await replay) as Replay);
    }

    public async getReplayById(replayId: number) {
        return api.cacheDb.selectFrom("replay").selectAll().where("replayId", "=", replayId).executeTakeFirst();
    }

    public async getReplayByGameId(gameId: string) {
        return api.cacheDb.selectFrom("replay").selectAll().where("gameId", "=", gameId).executeTakeFirst();
    }

    public async getTotalReplayCount() {
        const { num_replays } = await api.cacheDb.selectFrom("replay").select(api.cacheDb.fn.count<number>("replayId").as("num_replays")).executeTakeFirstOrThrow();
        return num_replays;
    }

    public async queueReplaysToCache() {
        let replayFiles = await fs.promises.readdir(this.replaysDir);
        replayFiles = replayFiles.filter((replayFile) => replayFile.endsWith("sdfz"));

        const cachedReplayFiles = await api.cacheDb.selectFrom("replay").select(["fileName"]).execute();
        const cachedReplayFileNames = cachedReplayFiles.map((file) => file.fileName);

        const erroredReplayFiles = await api.cacheDb.selectFrom("replayError").select(["fileName"]).execute();
        const erroredReplayFileNames = erroredReplayFiles.map((file) => file.fileName);

        const replaysFilesToCache = replayFiles.filter((file) => !cachedReplayFileNames.includes(file) && !erroredReplayFileNames.includes(file));

        for (const replayFileToCache of replaysFilesToCache) {
            this.replayCacheQueue.add(replayFileToCache);
        }
    }

    public async deleteReplay(replayId: number) {
        try {
            const { fileName } = await api.cacheDb.deleteFrom("replay").where("replayId", "=", replayId).returning("fileName").executeTakeFirstOrThrow();
            const filePath = path.join(api.info.contentPath, "demos", fileName);
            await fs.promises.rm(filePath);
        } catch (err) {
            console.error("Error deleting replay", err);
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
                const replayFilePath = path.join(api.info.contentPath, "demos", replayToCache);
                const fileInUse = await isFileInUse(replayFilePath);
                if (fileInUse) {
                    console.debug(`Cannot parse replay yet because it is still being written: ${replayToCache}`);
                    this.replayCacheQueue.delete(replayToCache);
                } else {
                    await this.cacheReplay(replayFilePath);
                }
            } else {
                await delay(500);
            }
        }
    }
    protected async cacheReplay(replayFilePath: string) {
        const replayFileName = path.parse(replayFilePath).base;
        console.debug(`Caching: ${replayFileName}`);

        try {
            const replayData = await this.parseReplay(replayFilePath);

            if (replayData.gameId === "00000000000000000000000000000000") {
                throw new Error(`invalid gameId for replay: ${replayFileName}`);
            }

            const conflictingReplay = await this.getReplayByGameId(replayData.gameId);
            if (conflictingReplay) {
                // when leaving a game and rejoining it, 2 demo files are created with the same gameId. below we delete the shortest replay
                if (conflictingReplay.gameDurationMs > replayData.gameDurationMs) {
                    await fs.promises.rm(replayFilePath);
                } else {
                    const filePath = path.join(api.info.contentPath, "demos", conflictingReplay.fileName);
                    await fs.promises.rm(filePath);

                    await api.cacheDb
                        .insertInto("replay")
                        .values(replayData)
                        .onConflict((oc) => oc.doUpdateSet(replayData))
                        .execute();
                }
            } else {
                await api.cacheDb.insertInto("replay").values(replayData).execute();
            }

            console.debug(`Cached replay: ${replayFileName}`);

            this.onReplayCached.dispatch();
        } catch (err) {
            console.error(`Error caching replay: ${replayFileName}`, err);

            await api.cacheDb
                .insertInto("replayError")
                .onConflict((oc) => oc.doNothing())
                .values({ fileName: replayFileName })
                .execute();
        }

        this.replayCacheQueue.delete(replayFileName);
    }
}
