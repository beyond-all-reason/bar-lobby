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

    protected abstract cacheItem(itemFilePath: string): Promise<{ key: string; value: T; }>;

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

        this.cacheItems();

        return this;
    }

    public async cacheItems(recacheAll = false) {
        console.log(`Caching items in ${this.itemDir}`);

        const mapFileNames = await fs.promises.readdir(this.itemDir);
        const cachedMapFileNames = Object.keys(this.items);

        const mapsToCache = mapFileNames.filter(fileName => {
            const fileTypeFiler = !this.fileTypeFilter.length || this.fileTypeFilter.some(ext => fileName.endsWith(ext));
            return (recacheAll || !cachedMapFileNames.includes(fileName)) && fileTypeFiler;
        });

        if (mapsToCache.length) {
            this.onItemsCacheStart.dispatch();
        }

        let mapsCached = 0;
        for (const mapFileName of mapsToCache) {
            const filePath = path.join(this.itemDir, mapFileName);
            try {
                this.onItemCacheStart.dispatch({
                    totalItemsToCache: mapsToCache.length,
                    currentItemsCached: mapsCached,
                    currentItem: mapFileName,
                });

                console.log(`Caching ${mapFileName}`);

                const item = await this.cacheItem(filePath);

                this.items[item.key] = item.value;

                await this.saveCachedItems();

                mapsCached++;

                this.onItemCacheFinish.dispatch({
                    totalItemsToCache: mapsToCache.length,
                    currentItemsCached: mapsCached,
                    currentItem: mapFileName,
                });

                console.log(`Cached ${mapFileName}`);
            } catch (err) {
                console.warn(`Error caching file: ${filePath}`, err);
                mapsToCache.splice(mapsToCache.indexOf(mapFileName), 1);
            }
        }

        if (mapsToCache.length) {
            this.onItemsCacheFinish.dispatch(this.items);
        }

        console.log(`All files cached in ${this.itemDir}`);
    }

    protected async loadCachedItems() {
        if (!fs.existsSync(this.cacheFilePath)) {
            return;
        }

        const cachedItemsStr = await fs.promises.readFile(this.cacheFilePath, "utf-8");
        this.items = JSON.parse(cachedItemsStr);

        this.onCacheLoaded.dispatch(this.items);
    }

    protected async saveCachedItems() {
        await fs.promises.writeFile(this.cacheFilePath, JSON.stringify(this.items));

        this.onCacheSaved.dispatch(this.items);
    }
}