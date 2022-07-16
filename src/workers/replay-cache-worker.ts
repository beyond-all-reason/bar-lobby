import { BetterWorker, BetterWorkerHost } from "jaz-ts-utils";
import { JsonDB } from "node-json-db";
import { Config } from "node-json-db/dist/lib/JsonDBConfig";
import * as path from "path";
import { DemoParser } from "sdfz-demo-parser";

import { ReplayData } from "@/model/replay";
import { AbstractFileCache } from "@/workers/abstract-file-cache";

class ReplayCache extends AbstractFileCache<ReplayData> {
    protected parser: DemoParser;
    protected db: JsonDB;

    constructor(cacheFilePath: string, dataDir: string) {
        super(cacheFilePath, path.join(dataDir, "demos"), [".sdfz"]);

        this.parser = new DemoParser();

        console.log(cacheFilePath);

        this.db = new JsonDB(new Config("test", true, false, "/"));
    }

    public async cacheItem(itemFilePath: string) {
        const fileName = path.parse(itemFilePath).base;
        console.log(`Caching replay: ${fileName}`);
        try {
            //TODO
        } catch (err) {
            console.warn(`Error caching replay ${fileName}`, err);
            throw err;
        }
    }

    public async clearItemFromCache(filename: string) {
        //TODO
    }
}

export class ReplayCacheWorkerHost extends BetterWorkerHost {
    constructor(worker: Worker) {
        super(worker);
    }

    public async init(replayCacheArgs: ConstructorParameters<typeof ReplayCache>) {
        this.send("init", replayCacheArgs);

        return this;
    }

    public async cacheItems() {
        await this.invoke("cache-replays");
    }

    public async cacheItem(filename: string) {
        await this.invoke("cache-replay", filename);
    }

    public async clearItem(filename: string) {
        await this.invoke("clear-replay", filename);
    }
}

const worker = new BetterWorker();
let replayCache: ReplayCache;

// TODO: make a cleaner way of doing this that enforces sent data types
worker.on("init").addOnce(async (data: ConstructorParameters<typeof ReplayCache>) => {
    replayCache = new ReplayCache(...data);

    replayCache.onItemsCacheStart.add((data) => worker.send("items-cache-start", data));
    replayCache.onItemsCacheFinish.add((data) => worker.send("items-cache-finish", data));
    replayCache.onItemCacheStart.add((data) => worker.send("item-cache-start", data));
    replayCache.onItemCacheFinish.add((data) => worker.send("item-cache-finish", data));
    replayCache.onCacheLoaded.add((data) => worker.send("item-cache-loaded", data));
    replayCache.onCacheSaved.add((data) => worker.send("item-cache-saved", data));

    await replayCache.init();
});

worker.on("cache-replays").add(async () => {
    await replayCache.cacheItems();
});

worker.on("cache-replay").add(async (filename: string) => {
    try {
        await replayCache.cacheItem(filename);
    } catch (err) {
        console.warn(err);
    }
});

worker.on("clear-replay").add(async (filename: string) => {
    await replayCache.clearItemFromCache(filename);
});
