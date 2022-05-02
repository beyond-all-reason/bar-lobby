import * as fs from "fs";
import * as path from "path";
import { Signal } from "jaz-ts-utils";

export interface CacheProgress {
    totalItemsToCache: number;
    currentItemsCached: number;
    currentItem: string;
}

export abstract class AbstractFileCache<T> {
    public onCacheLoaded: Signal<{ [key: string]: T }> = new Signal();
    public onCacheSaved: Signal<{ [key: string]: T }> = new Signal();
    public onItemsCacheStart: Signal = new Signal();
    public onItemsCacheFinish: Signal<{ [key: string]: T }> = new Signal();
    public onItemCacheStart: Signal<CacheProgress> = new Signal();
    public onItemCacheFinish: Signal<CacheProgress> = new Signal();

    protected cacheFilePath: string;
    protected itemDir: string;
    protected fileTypeFilter: string[];

    protected items: Record<string, T> = {};

    constructor(cacheFilePath: string, itemDir: string, fileTypeFilter: string[] = []) {
        this.cacheFilePath = cacheFilePath;
        this.itemDir = itemDir;
        this.fileTypeFilter = fileTypeFilter;
    }

    public async init() {
        const { dir } = path.parse(this.cacheFilePath);
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.mkdir(this.itemDir, { recursive: true });

        await this.loadCachedItems();

        return this;
    }

    public async cacheItems(recacheAll = false) {
        await this.init();

        console.log(`Caching items in ${this.itemDir}`);

        const fileNames = await fs.promises.readdir(this.itemDir);
        const cachedMapFileNames = Object.keys(this.items);

        const filesToCache = fileNames.filter(fileName => {
            const fileTypeFiler = !this.fileTypeFilter.length || this.fileTypeFilter.some(ext => fileName.endsWith(ext));
            return (recacheAll || !cachedMapFileNames.includes(fileName)) && fileTypeFiler;
        });

        if (filesToCache.length) {
            this.onItemsCacheStart.dispatch();
        }

        let mapsCached = 0;
        for (const fileName of filesToCache) {
            const filePath = path.join(this.itemDir, fileName);
            try {
                this.onItemCacheStart.dispatch({
                    totalItemsToCache: filesToCache.length,
                    currentItemsCached: mapsCached,
                    currentItem: fileName,
                });

                await this.cacheItem(filePath);

                mapsCached++;

                this.onItemCacheFinish.dispatch({
                    totalItemsToCache: filesToCache.length,
                    currentItemsCached: mapsCached,
                    currentItem: fileName,
                });
            } catch (err) {
                filesToCache.splice(filesToCache.indexOf(fileName), 1);
            }
        }

        if (filesToCache.length) {
            this.onItemsCacheFinish.dispatch(this.items);
        }

        console.log(`All files cached in ${this.itemDir}`);
    }

    public abstract cacheItem(itemFilePath: string): Promise<void>;

    public abstract clearItemFromCache(filename: string): Promise<void>;

    protected async loadCachedItems() {
        if (!fs.existsSync(this.cacheFilePath)) {
            return;
        }

        try {
            const cachedItemsStr = await fs.promises.readFile(this.cacheFilePath, "utf-8");
            this.items = JSON.parse(cachedItemsStr);

            this.onCacheLoaded.dispatch(this.items);
        } catch (err) {
            console.error(err);
            console.warn("Cache file corrupted, clearing cache");

            await fs.promises.rm(this.cacheFilePath);
        }
    }

    protected async saveCachedItems() {
        await fs.promises.writeFile(this.cacheFilePath, JSON.stringify(this.items));

        this.onCacheSaved.dispatch(this.items);
    }
}