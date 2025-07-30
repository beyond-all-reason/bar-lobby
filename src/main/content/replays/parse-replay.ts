// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Replay } from "@main/content/replays/replay";
import path from "path";
import { Worker } from "worker_threads";
import os from "os";

class WorkerPool {
    private workers: Worker[] = [];
    private availableWorkers: Worker[] = [];
    private queue: Array<{
        replayFilePath: string;
        resolve: (replay: Replay) => void;
        reject: (reason?: string) => void;
    }> = [];

    private jobs = new Map<
        string,
        {
            resolve: (replay: Replay) => void;
            reject: (reason?: string) => void;
        }
    >();

    constructor(poolSize: number = os.cpus().length) {
        for (let i = 0; i < poolSize; i++) {
            this.createWorker();
        }
    }

    private createWorker(): void {
        const worker = new Worker(path.join(__dirname, "parse-replay-worker.cjs"));

        worker.on("message", ({ replayFilePath, replay, error }) => {
            const promiseHandles = this.jobs.get(replayFilePath);
            if (!promiseHandles) {
                throw new Error("failed to access image source promise handlers");
            }

            if (error) {
                promiseHandles.reject(error);
            } else {
                promiseHandles.resolve(replay);
            }

            this.jobs.delete(replayFilePath);
            this.availableWorkers.push(worker);
            this.processQueue();
        });

        worker.on("error", (error) => {
            console.error("Worker error:", error);
            // Remove failed worker and create a new one
            const index = this.workers.indexOf(worker);
            if (index > -1) {
                this.workers.splice(index, 1);
                this.createWorker();
            }
        });

        this.workers.push(worker);
        this.availableWorkers.push(worker);
    }

    private processQueue(): void {
        if (this.queue.length === 0 || this.availableWorkers.length === 0) {
            return;
        }

        const job = this.queue.shift()!;
        const worker = this.availableWorkers.shift()!;

        this.jobs.set(job.replayFilePath, {
            resolve: job.resolve,
            reject: job.reject,
        });

        worker.postMessage(job.replayFilePath);
    }

    public parseReplay(replayFilePath: string) {
        return new Promise<Replay>((resolve, reject) => {
            this.queue.push({ replayFilePath, resolve, reject });
            this.processQueue();
        });
    }

    public terminate() {
        return Promise.all(this.workers.map((worker) => worker.terminate()));
    }
}

const workerPool = new WorkerPool();

export function asyncParseReplay(replayFilePath: string): Promise<Replay> {
    return workerPool.parseReplay(replayFilePath);
}

export function terminateWorkers() {
    return workerPool.terminate();
}
