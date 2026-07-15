// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as path from "path";

import { MapData } from "@main/content/maps/map-data";
import { MapDownloadQueue, type MapDownloadQueueEntry } from "@main/content/maps/map-download-queue";
import { logger } from "@main/utils/logger";
import { Signal } from "$/jaz-ts-utils/signal";
import { PrDownloaderAPI } from "@main/content/pr-downloader";
import { getMapsPaths } from "@main/config/app";
import chokidar, { FSWatcher } from "chokidar";
import { UltraSimpleMapParser } from "$/map-parser/ultrasimple-map-parser";
import { removeFromArray } from "$/jaz-ts-utils/object";
import { engineContentAPI } from "@main/content/engine/engine-content";
import { settingsService } from "@main/services/settings.service";
import { calcChecksum } from "@main/utils/checksums";

const log = logger("map-content.ts");

export type { MapDownloadQueueEntry } from "@main/content/maps/map-download-queue";

/**
 * @todo replace queue method with syncMapCache function once prd returns map file name
 */
export class MapContentAPI extends PrDownloaderAPI<string, MapData> {
    public mapNameFileNameLookup: { [springName: string]: string | undefined } = {};
    public fileNameMapNameLookup: { [fileName: string]: string | undefined } = {};

    public readonly onMapAdded: Signal<string> = new Signal();
    public readonly onMapDeleted: Signal<string> = new Signal();

    private watcher?: FSWatcher;

    protected cachingMaps = false;
    protected readonly mapCacheQueue: Set<string> = new Set();
    private readonly mapDownloadQueue = new MapDownloadQueue((springName) => this.downloadQueuedMap(springName));

    public readonly onMapDownloadQueueChanged = this.mapDownloadQueue.onChanged;

    public override async init() {
        this.initLookupMaps();
        this.startWatchingMapFolder();

        engineContentAPI.onDownloadComplete.add((downloadInfo) => {
            for (const [mapName, fileName] of Object.entries(this.mapNameFileNameLookup)) {
                if (fileName) {
                    calcChecksum(downloadInfo.name, mapName);
                }
            }
        });

        return super.init();
    }

    public async reinit() {
        for (const mapsDir of getMapsPaths()) {
            await fs.promises.mkdir(mapsDir, { recursive: true });
        }
        this.mapNameFileNameLookup = {};
        this.fileNameMapNameLookup = {};
        this.availableVersions.clear();
        await this.init();
    }

    protected async initLookupMaps() {
        async function* findMaps() {
            // We apply toReversed to keep the precedence order: higher precedence visited later.
            for (const mapsDir of getMapsPaths().toReversed()) {
                try {
                    yield* (await fs.promises.readdir(mapsDir)).filter((f) => f.endsWith(".sd7")).map((f) => path.join(mapsDir, f));
                } catch {
                    // dir may not exist yet (e.g. before first path confirmation)
                }
            }
        }
        log.debug("Scanning for maps");
        for await (const filePath of findMaps()) {
            try {
                const mapName = await this.getMapNameFromFile(filePath);
                const fileName = path.basename(filePath);

                this.mapNameFileNameLookup[mapName] = fileName;
                this.fileNameMapNameLookup[fileName] = mapName;
            } catch (err) {
                log.error(`File may be corrupted, removing ${filePath}: ${err}`);
                fs.promises.rm(filePath);
            }
        }
        log.info(`Found ${Object.keys(this.mapNameFileNameLookup).length} maps`);
    }

    ultraSimpleMapParser = new UltraSimpleMapParser();
    protected async getMapNameFromFile(filePath: string) {
        const parsedMap = await this.ultraSimpleMapParser.parseMap(filePath);
        return parsedMap.springName;
    }

    protected async startWatchingMapFolder() {
        //using chokidar to watch for changes in the maps folder
        await this.watcher?.close();
        this.watcher = chokidar
            .watch(getMapsPaths().slice(), {
                ignoreInitial: true, //ignore the initial scan
                awaitWriteFinish: true, //wait for the file to be fully written before emitting the event
            })
            .on("add", (filepath) => {
                if (!filepath.endsWith("sd7")) {
                    return;
                }
                log.debug(`Chokidar -=- Map added: ${filepath}`);
                const filename = path.basename(filepath);
                // Update the lookup maps
                this.getMapNameFromFile(filepath).then((mapName) => {
                    this.mapNameFileNameLookup[mapName] = filename;
                    this.fileNameMapNameLookup[filename] = mapName;
                    this.onMapAdded.dispatch(mapName);

                    const defaultEngine = engineContentAPI.getDefaultEngine();
                    if (defaultEngine?.installed) {
                        calcChecksum(defaultEngine.id, mapName);
                    }
                });
            })
            .on("unlink", (filepath) => {
                if (!filepath.endsWith("sd7")) {
                    return;
                }
                log.debug(`Chokidar -=- Map removed: ${filepath}`);

                const pathBaseName = path.basename(filepath);

                if (pathBaseName) {
                    const springName = this.fileNameMapNameLookup[pathBaseName];
                    this.fileNameMapNameLookup[pathBaseName] = undefined;
                    if (springName) {
                        this.mapNameFileNameLookup[springName] = undefined;
                        this.onMapDeleted.dispatch(springName);
                    }
                }
            });
    }

    public isVersionInstalled(springName: string): boolean {
        return this.mapNameFileNameLookup[springName] !== undefined;
    }

    public getMapDownloadQueue(): MapDownloadQueueEntry[] {
        return this.mapDownloadQueue.getSnapshot();
    }

    public async downloadMaps(springNames: string[]) {
        return await Promise.all(springNames.map((springName) => this.downloadMap(springName)));
    }

    public downloadMap(springName: string): Promise<void> {
        if (this.isVersionInstalled(springName)) return Promise.resolve();

        return this.mapDownloadQueue.enqueue(springName);
    }

    private async downloadQueuedMap(springName: string) {
        if (this.isVersionInstalled(springName)) return;
        const downloadInfo = await this.downloadContent("map", springName);
        removeFromArray(this.currentDownloads, downloadInfo);
        this.onDownloadComplete.dispatch(downloadInfo);
    }

    public async attemptCacheErrorMaps() {
        throw new Error("Method not implemented.");
    }

    public async uninstallVersion(version: MapData) {
        for (const mapsDir of getMapsPaths()) {
            const mapFile = path.join(mapsDir, version.filename);
            await fs.promises.rm(mapFile, { force: true });
        }
        log.debug(`Map removed: ${version.springName}`);
    }
}

export const mapContentAPI = new MapContentAPI();
