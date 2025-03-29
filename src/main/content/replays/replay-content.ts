import { Signal } from "$/jaz-ts-utils/signal";
import { REPLAYS_PATH } from "@main/config/app";
import { mapContentAPI } from "@main/content/maps/map-content";
import { asyncParseReplay } from "@main/content/replays/parse-replay";
import { Replay } from "@main/content/replays/replay";
import { gameAPI } from "@main/game/game";
import { logger } from "@main/utils/logger";
import chokidar from "chokidar";
import fs from "fs";
import fsPromises from "fs/promises"

import path from "path";

const log = logger("replay-content.ts");

export class ReplayContentAPI {
    public readonly onReplayCachingStarted: Signal<string> = new Signal();
    public readonly onReplayCached: Signal<Replay> = new Signal();
    public readonly onReplayDeleted: Signal<string> = new Signal();

    protected readonly replayCacheQueue: Set<string> = new Set();
    protected cachingReplays = false;

    public async init() {
        await fs.promises.mkdir(REPLAYS_PATH, { recursive: true });
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
                // Pass this object so that methods can be referenced from within the callback.
                this.cacheReplay(filepath, this);
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
        await mapContentAPI.downloadMap(replay.mapSpringName);
        gameAPI.launchReplay((await replay) as Replay);
    }

    public async sync(replayFileNames: string[]) {
        const existingFiles = await this.scanFolderForReplays();
        const replaysToDelete = replayFileNames.filter((fileName) => !existingFiles.includes(fileName));
        replaysToDelete.forEach((fileName) => this.onReplayDeleted.dispatch(fileName));
        existingFiles
            .filter((fileName) => !replayFileNames.includes(fileName))
            .map((fileName) => path.join(REPLAYS_PATH, fileName))
            .forEach((filePath) => this.cacheReplay(filePath, this));
    }

    protected async scanFolderForReplays() {
        let replayFiles = await fs.promises.readdir(REPLAYS_PATH);
        replayFiles = replayFiles.filter((replayFile) => replayFile.endsWith("sdfz"));
        return replayFiles;
    }

    public async deleteReplay(fileName: string) {
        try {
            await fs.promises.rm(path.join(REPLAYS_PATH, fileName));
        } catch (err) {
            log.error("Error deleting replay", err);
        }
    }

    protected async cacheReplay(replayFilePath: string, obj: ReplayContentAPI) {
        // Don't try to cache an empty replay file
        const stat = await fsPromises.stat(replayFilePath);
        if (stat.size === 0) return;

        log.debug(`Caching: ${replayFilePath}`);
        try {
            const replayData = await asyncParseReplay(replayFilePath);
            if (replayData.gameId === "00000000000000000000000000000000") {
                throw new Error(`invalid gameId for replay: ${replayFilePath}`);
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
            log.debug(`Cached replay: ${replayFilePath}`);
            obj.onReplayCached.dispatch(replayData);
        } catch (err) {
            log.error(`Error caching replay: ${replayFilePath}`, err);
            log.error(err);
            fs.promises.rename(replayFilePath, replayFilePath + ".error");
            //TODO emit error signal
        }
    }
}

export const replayContentAPI = new ReplayContentAPI();
