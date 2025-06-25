// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Replay } from "@main/content/replays/replay";
import path from "path";
import { Worker } from "worker_threads";
import { logger } from "@main/utils/logger";

const log = logger("parse-replay.ts");
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

    if (!promiseHandles) {
        log.warn(`No promise handlers found for replay: ${replayFilePath}`);
        return; // Handle gracefully instead of crashing
    }

    if (error) {
        log.error(`Error parsing replay ${replayFilePath}:`, error);
        promiseHandles.reject(error);
    } else {
        promiseHandles.resolve(replay);
    }
    jobs.delete(replayFilePath);
});

export function asyncParseReplay(replayFilePath: string): Promise<Replay> {
    return new Promise<Replay>((resolve, reject) => {
        // Normalize path to avoid mismatches
        const normalizedPath = path.resolve(replayFilePath);

        // Check if already processing
        if (jobs.has(normalizedPath)) {
            reject(new Error(`Duplicate processing request for ${normalizedPath}`));
            return;
        }

        jobs.set(normalizedPath, { resolve, reject });
        worker.postMessage(normalizedPath);
    });
}
