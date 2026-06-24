// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "path";
import { Worker } from "worker_threads";

const worker = new Worker(path.join(__dirname, "map-image-worker.cjs"));

const jobs = new Map<
    string,
    {
        resolve: (value: ArrayBuffer | undefined) => void;
        reject: (reason?: unknown) => void;
    }
>();
const promises = new Map<string, Promise<ArrayBuffer | undefined>>();

worker.on("message", ({ imageSource, arrayBuffer, error }) => {
    const promiseHandles = jobs.get(imageSource);

    if (!promiseHandles) throw new Error("failed to access image source promise handlers");

    if (error) {
        console.error(`Failed to fetch map image ${imageSource}: ${error}`);
        promiseHandles.resolve(undefined);
    } else {
        promiseHandles.resolve(arrayBuffer);
    }
    jobs.delete(imageSource);
    promises.delete(imageSource);
});

worker.on("error", (error) => {
    for (const [, { reject }] of jobs) {
        reject(error);
    }
    jobs.clear();
    promises.clear();
});

worker.on("exit", (code) => {
    if (code !== 0) {
        const error = new Error(`map-image-worker stopped with exit code ${code}`);
        for (const [, { reject }] of jobs) {
            reject(error);
        }
        jobs.clear();
        promises.clear();
    }
});

export function fetchMapImages(imageSource: string): Promise<ArrayBuffer | undefined> {
    const existingPromise = promises.get(imageSource);
    if (existingPromise) return existingPromise;

    const promise = new Promise<ArrayBuffer | undefined>((resolve, reject) => {
        jobs.set(imageSource, { resolve, reject });
        worker.postMessage(imageSource);
    });
    promises.set(imageSource, promise);
    return promise;
}
