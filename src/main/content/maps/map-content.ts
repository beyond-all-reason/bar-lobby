// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as path from "path";

import { MapData } from "@main/content/maps/map-data";
import { logger } from "@main/utils/logger";
import { Signal } from "$/jaz-ts-utils/signal";
import { PrDownloaderAPI } from "@main/content/pr-downloader";
import { MAPS_PATHS } from "@main/config/app";
import chokidar from "chokidar";
import { UltraSimpleMapParser } from "$/map-parser/ultrasimple-map-parser";
import { removeFromArray } from "$/jaz-ts-utils/object";

const log = logger("map-content.ts");

/**
 * @todo replace queue method with syncMapCache function once prd returns map file name
 */
export class MapContentAPI extends PrDownloaderAPI<string, MapData> {
    public mapNameFileNameLookup: { [springName: string]: string | undefined } = {};
    public fileNameMapNameLookup: { [fileName: string]: string | undefined } = {};

    public readonly onMapAdded: Signal<string> = new Signal();
    public readonly onMapDeleted: Signal<string> = new Signal();

    protected readonly mapCacheQueue: Set<string> = new Set();
    protected cachingMaps = false;

    public override async init() {
        for (const mapsDir of MAPS_PATHS) {
            await fs.promises.mkdir(mapsDir, { recursive: true });
        }
        this.initLookupMaps();
        this.startWatchingMapFolder();
        return super.init();
    }

    protected async initLookupMaps() {
        async function* findMaps() {
            // We apply toReversed to keep the precedence order: higher precedence visited later.
            for (const mapsDir of MAPS_PATHS.toReversed()) {
                yield* (await fs.promises.readdir(mapsDir)).filter((f) => f.endsWith(".sd7")).map((f) => path.join(mapsDir, f));
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

    protected async getMapNameFromFile(filePath: string) {
        const ultraSimpleMapParser = new UltraSimpleMapParser();
        const parsedMap = await ultraSimpleMapParser.parseMap(filePath);
        return parsedMap.springName;
    }

    protected startWatchingMapFolder() {
        //using chokidar to watch for changes in the maps folder
        chokidar
            .watch(MAPS_PATHS.slice(), {
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

    public async downloadMaps(springNames: string[]) {
        return Promise.all(springNames.map((springName) => this.downloadMap(springName)));
    }

    public async downloadMap(springName: string) {
        if (this.isVersionInstalled(springName)) return;
        if (this.currentDownloads.some((download) => download.name === springName)) {
            return await new Promise<void>((resolve) => {
                this.onDownloadComplete.addOnce((mapData) => {
                    if (mapData.name === springName) {
                        resolve();
                    }
                });
            });
        }
        const downloadInfo = await this.downloadContent("map", springName);
        removeFromArray(this.currentDownloads, downloadInfo);
        this.onDownloadComplete.dispatch(downloadInfo);
    }

    public async attemptCacheErrorMaps() {
        throw new Error("Method not implemented.");
    }

    public async uninstallVersion(version: MapData) {
        for (const mapsDir of MAPS_PATHS) {
            const mapFile = path.join(mapsDir, version.filename);
            await fs.promises.rm(mapFile, { force: true });
        }
        log.debug(`Map removed: ${version.springName}`);
    }
}

export const mapContentAPI = new MapContentAPI();
