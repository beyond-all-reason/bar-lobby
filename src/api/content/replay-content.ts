import * as path from "path";

import { AbstractContentAPI } from "@/api/content/abstract-content-api";
import { ReplayCacheWorkerHost } from "@/workers/replay-cache-worker";

export class ReplayContentAPI extends AbstractContentAPI {
    protected replayCache: ReplayCacheWorkerHost;

    constructor() {
        super();

        this.replayCache = new ReplayCacheWorkerHost(new Worker(new URL("../../workers/replay-cache-worker.ts", import.meta.url), { type: "module" }));
    }

    public async init() {
        const cacheStoreDir = path.join(api.info.configPath);
        const mapCacheFile = path.join(cacheStoreDir, "replay-cache.json");

        await this.replayCache.init([mapCacheFile, api.info.contentPath]);

        this.replayCache.cacheItems();

        return this;
    }
}
