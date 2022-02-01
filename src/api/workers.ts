import { BetterWorkerHost } from "@/utils/better-worker";

interface WorkersAPIConfig {
    cacheWorker: Worker;
}

export class WorkersAPI {
    public cacheWorker: BetterWorkerHost;

    constructor(workers: WorkersAPIConfig) {
        this.cacheWorker = new BetterWorkerHost(workers.cacheWorker);
    }
}