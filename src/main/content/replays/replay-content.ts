import { delay } from "$/jaz-ts-utils/delay";
import { Signal } from "$/jaz-ts-utils/signal";
import { REPLAYS_PATH } from "@main/config/app";
import { mapContentAPI } from "@main/content/maps/map-content";
import { asyncParseReplay } from "@main/content/replays/parse-replay";
import { Replay } from "@main/content/replays/replay";
import { gameAPI } from "@main/game/game";
import { isFileInUse } from "@main/utils/file";
import { logger } from "@main/utils/logger";
import chokidar from "chokidar";
import fs from "fs";

import path from "path";
import { reactive } from "vue";

const log = logger("replay-content.ts");

export class ReplayContentAPI {
    public readonly onReplayCachingStarted: Signal<string> = new Signal();
    public readonly onReplayCached: Signal<Replay> = new Signal();
    public readonly onReplayDeleted: Signal<string> = new Signal();

    protected readonly replayCacheQueue: Set<string> = reactive(new Set());
    protected cachingReplays = false;

    public async init() {
        await fs.promises.mkdir(REPLAYS_PATH, { recursive: true });
        this.startCacheReplayConsumer();
        this.startWatchingReplayFolder();
        return this;
    }

    protected startWatchingReplayFolder() {
        //using chokidar to watch for changes in the replay folder
        chokidar
            .watch(REPLAYS_PATH, {
                ignoreInitial: true, //ignore the initial scan
                awaitWriteFinish: true, //wait for the file to be fully written before emitting the event
            })
            .on("add", (filepath) => {
                if (!filepath.endsWith("sdfz")) {
                    return;
                }
                log.debug(`Chokidar -=- Replay added: ${filepath}`);
                const filename = path.basename(filepath);
                this.queueReplaysToCache([filename]);
            })
            .on("unlink", (filepath) => {
                if (!filepath.endsWith("sdfz")) {
                    return;
                }
                log.debug(`Chokidar -=- Replay removed: ${filepath}`);
                this.onReplayDeleted.dispatch(path.basename(filepath));
            });
    }

    public async copyParseAndLaunchReplay(filePath: string) {
        let replayPath = filePath;
        if (!replayPath.startsWith(REPLAYS_PATH)) {
            replayPath = path.join(REPLAYS_PATH, path.basename(replayPath));
            await fs.promises.copyFile(filePath, replayPath);
        }
        const replay = await asyncParseReplay(replayPath);
        await mapContentAPI.downloadMap(replay.mapScriptName);
        gameAPI.launchReplay((await replay) as Replay);
    }

    public async sync(replayFileNames: string[]) {
        const existingFiles = await this.scanFolderForReplays();
        const replaysToDelete = replayFileNames.filter((fileName) => !existingFiles.includes(fileName));
        replaysToDelete.forEach((fileName) => this.onReplayDeleted.dispatch(fileName));
        const replaysToCache = existingFiles.filter((fileName) => !replayFileNames.includes(fileName));
        this.queueReplaysToCache(replaysToCache);
    }

    protected async scanFolderForReplays() {
        let replayFiles = await fs.promises.readdir(REPLAYS_PATH);
        replayFiles = replayFiles.filter((replayFile) => replayFile.endsWith("sdfz"));
        return replayFiles;
    }

    protected async queueReplaysToCache(filenames?: string[]) {
        let replayFiles = filenames;
        if (!filenames) {
            replayFiles = await this.scanFolderForReplays();
        }
        for (const mapFileToCache of replayFiles) {
            this.replayCacheQueue.add(mapFileToCache);
            this.onReplayCachingStarted.dispatch(mapFileToCache);
        }
    }

    public async deleteReplay(fileName: string) {
        try {
            await fs.promises.rm(path.join(REPLAYS_PATH, fileName));
        } catch (err) {
            log.error("Error deleting replay", err);
        }
    }

    protected async startCacheReplayConsumer() {
        if (this.cachingReplays) {
            log.warn("Don't call cacheReplays more than once");
            return;
        }
        this.cachingReplays = true;

        while (true) {
            const [replayToCache] = this.replayCacheQueue;
            if (replayToCache) {
                const replayFilePath = path.join(REPLAYS_PATH, replayToCache);
                const fileInUse = await isFileInUse(replayFilePath);
                if (fileInUse) {
                    log.debug(`Cannot parse replay yet because it is still being written: ${replayToCache}`);
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
        log.debug(`Caching: ${replayFileName}`);
        try {
            const replayData = await asyncParseReplay(replayFilePath);
            if (replayData.gameId === "00000000000000000000000000000000") {
                throw new Error(`invalid gameId for replay: ${replayFileName}`);
            }
            // TODO handle this use case
            // const conflictingReplay = await this.getReplayByGameId(replayData.gameId);
            // if (conflictingReplay) {
            //     // when leaving a game and rejoining it, 2 demo files are created with the same gameId. below we delete the shortest replay
            //     if (conflictingReplay.gameDurationMs > replayData.gameDurationMs) {
            //         await fs.promises.rm(replayFilePath);
            //     } else {
            //         const filePath = path.join(REPLAYS_PATH, conflictingReplay.fileName);
            //         await fs.promises.rm(filePath);
            //     }
            // }
            log.debug(`Cached replay: ${replayFileName}`);
            this.onReplayCached.dispatch(replayData);
        } catch (err) {
            log.error(`Error caching replay: ${replayFileName}`, err);
            log.error(err);
            fs.promises.rename(replayFilePath, replayFilePath + ".error");
            //TODO emit error signal
        }
        this.replayCacheQueue.delete(replayFileName);
    }
}

export const replayContentAPI = new ReplayContentAPI();
