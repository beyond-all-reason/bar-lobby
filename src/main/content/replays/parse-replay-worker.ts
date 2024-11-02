import { parseReplay } from "@main/content/replays/parse-replay";
import { isMainThread, parentPort, workerData } from "worker_threads";

if (isMainThread) {
    throw new Error("This script should be run in worker thread.");
} else {
    const { replayFilePath } = workerData;
    parseReplay(replayFilePath).then((data) => {
        parentPort.postMessage(data);
    });
}
