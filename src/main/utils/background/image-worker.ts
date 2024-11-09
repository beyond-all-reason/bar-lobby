import { isMainThread, parentPort } from "worker_threads";

if (isMainThread) {
    throw new Error("This script should be run in worker thread.");
} else {
    // listen to messages from the main thread
    parentPort.on("message", async (imageSource: string) => {
        try {
            const response = await fetch(imageSource);
            const arrayBuffer = await response.arrayBuffer();
            parentPort.postMessage({ imageSource, arrayBuffer });
        } catch (error) {
            console.error(error);
        }
    });
}
