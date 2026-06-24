// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { isMainThread, parentPort } from "worker_threads";

if (isMainThread) {
    throw new Error("This script should be run in worker thread.");
} else {
    if (!parentPort) throw new Error("Parent Port is not defined");

    const narrowedParentPort = parentPort;

    const FETCH_IMAGE_TIMEOUT_MS = 10_000;

    // listen to messages from the main thread
    narrowedParentPort.on("message", async (imageSource: string) => {
        try {
            const response = await fetch(imageSource, { signal: AbortSignal.timeout(FETCH_IMAGE_TIMEOUT_MS) });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();

            narrowedParentPort.postMessage({ imageSource, arrayBuffer });
        } catch (error) {
            console.error(error);
            narrowedParentPort.postMessage({ imageSource, error: error instanceof Error ? error.message : String(error) });
        }
    });
}
