import { MapCacheWorkerHost } from "@/workers/map-cache-worker";

interface WorkersAPIConfig {
    mapCache: Worker;
}

export class WorkersAPI {
    public mapCache: MapCacheWorkerHost;

    constructor(workers: WorkersAPIConfig) {
        this.mapCache = new MapCacheWorkerHost(workers.mapCache);
    }
}