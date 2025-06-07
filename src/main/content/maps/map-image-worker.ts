// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { isMainThread, parentPort } from "worker_threads";

if (isMainThread) {
    throw new Error("This script should be run in worker thread.");
} else {
    if (!parentPort) throw new Error("Parent Port is not defined");

    const narrowedParentPort = parentPort;

    // listen to messages from the main thread
    narrowedParentPort.on("message", async (imageSource: string) => {
        try {
            const response = await fetch(imageSource);
            const arrayBuffer = await response.arrayBuffer();

            narrowedParentPort.postMessage({ imageSource, arrayBuffer });
        } catch (error) {
            console.error(error);
        }
    });
}
