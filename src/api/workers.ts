import { MapCacheWorkerHost } from "@/workers/map-cache-worker";

interface WorkersAPIConfig {
    mapCacheWorker: Worker;
}

export class WorkersAPI {
    public mapCacheWorker: MapCacheWorkerHost;

    constructor(workers: WorkersAPIConfig) {
        this.mapCacheWorker = new MapCacheWorkerHost(workers.mapCacheWorker);
    }
}