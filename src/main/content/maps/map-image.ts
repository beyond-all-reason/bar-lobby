import path from "path";
import { Worker } from "worker_threads";

const worker = new Worker(path.join(__dirname, "map-image-worker.cjs"));

const jobs = new Map<
    string,
    {
        resolve: (value: ArrayBuffer) => void;
        reject: (reason?: string) => void;
    }
>();
const promises = new Map<string, Promise<ArrayBuffer>>();

worker.on("message", ({ imageSource, arrayBuffer }) => {
    const promiseHandles = jobs.get(imageSource);
    promiseHandles.resolve(arrayBuffer);
    jobs.delete(imageSource);
    promises.delete(imageSource);
});
// worker.on("error", reject);
// worker.on("exit", (code) => {
//     if (code !== 0) reject(new Error(`map-image-worker stopped with exit code ${code}`));
// });

export function fetchMapImages(imageSource: string): Promise<ArrayBuffer> {
    if (promises.has(imageSource)) return promises.get(imageSource);
    const promise = new Promise<ArrayBuffer>((resolve, reject) => {
        jobs.set(imageSource, { resolve, reject });
        worker.postMessage(imageSource);
    });
    promises.set(imageSource, promise);
    return promise;
}
