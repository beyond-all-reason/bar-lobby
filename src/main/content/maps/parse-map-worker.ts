import { parseMap } from "@main/content/maps/parse-map";
import { isMainThread, parentPort, workerData } from "worker_threads";

if (isMainThread) {
    throw new Error("This script should be run in worker thread.");
} else {
    const { mapPath } = workerData;
    parseMap(mapPath).then((data) => {
        parentPort.postMessage(data);
    });
}
