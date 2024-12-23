import { Replay } from "@main/content/replays/replay";
import path from "path";
import { Worker } from "worker_threads";

const worker = new Worker(path.join(__dirname, "parse-replay-worker.cjs"));

const jobs = new Map<
    string,
    {
        resolve: (replay: Replay) => void;
        reject: (reason?: string) => void;
    }
>();

worker.on("message", ({ replayFilePath, replay, error }) => {
    const promiseHandles = jobs.get(replayFilePath);
    if (error) {
        promiseHandles.reject(error);
    } else {
        promiseHandles.resolve(replay);
    }
    jobs.delete(replayFilePath);
});

export function asyncParseReplay(replayFilePath: string): Promise<Replay> {
    return new Promise<Replay>((resolve, reject) => {
        jobs.set(replayFilePath, { resolve, reject });
        worker.postMessage(replayFilePath);
    });
}
