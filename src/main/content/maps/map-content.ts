// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as path from "path";

import { MapData } from "@main/content/maps/map-data";
import { logger } from "@main/utils/logger";
import { Signal } from "$/jaz-ts-utils/signal";
import { PrDownloaderAPI } from "@main/content/pr-downloader";
import { MAPS_PATHS, ASSETS_PATH, WRITE_DATA_PATH } from "@main/config/app";
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

    // Check if file is in assets directory
    private isInAssetsDirectory(filePath: string): boolean {
        const assetsMapsPath = path.join(ASSETS_PATH, "maps");
        return filePath.includes(assetsMapsPath);
    }

    // Check if file is in writable directory
    private isInWritableDirectory(filePath: string): boolean {
        const writableMapsPath = path.join(WRITE_DATA_PATH, "maps");
        return filePath.includes(writableMapsPath);
    }

    public override async init() {
        console.log(`MAP PATHS: ${MAPS_PATHS}`);
        for (const mapsDir of MAPS_PATHS) {
            await fs.promises.mkdir(mapsDir, { recursive: true });
        }
        this.initLookupMaps();
        this.startWatchingMapFolder();
        return super.init();
    }

    protected async initLookupMaps() {
        async function* findMaps() {
            console.log(`FIND MAPS`);
            // We apply toReversed to keep the precedence order: higher precedence visited later.
            for (const mapsDir of MAPS_PATHS.toReversed()) {
                yield* (await fs.promises.readdir(mapsDir)).filter((f) => f.endsWith(".sd7")).map((f) => path.join(mapsDir, f));
            }
        }
        console.log(`FIND MAPS AFTER`);
        log.debug("Scanning for maps");
        for await (const filePath of findMaps()) {
            console.log(`MAP FILE PATH: ${filePath}`);
            try {
                const mapName = await this.getMapNameFromFile(filePath);
                const fileName = path.basename(filePath);

                this.mapNameFileNameLookup[mapName] = fileName;
                this.fileNameMapNameLookup[fileName] = mapName;
            } catch (err) {
                console.log(`MAP PARSING ERROR for ${filePath}: ${err}`);

                // Only delete from writable directories
                if (this.isInWritableDirectory(filePath)) {
                    console.log(`File may be corrupted, removing from writable directory ${filePath}: ${err}`);
                    fs.promises.rm(filePath);
                } else if (this.isInAssetsDirectory(filePath)) {
                    console.log(`File in assets directory failed parsing, skipping ${filePath}: ${err}`);
                    // Don't delete from assets directory - it's read-only
                } else {
                    console.log(`Unknown directory, skipping deletion for ${filePath}: ${err}`);
                }
            }
        }
        log.info(`Found ${Object.keys(this.mapNameFileNameLookup).length} maps`);
    }

    ultraSimpleMapParser = new UltraSimpleMapParser();

    /**
     * Validate that a file exists and is readable before attempting to parse it
     */
    private async validateMapFile(filePath: string): Promise<boolean> {
        try {
            const stats = await fs.promises.stat(filePath);
            if (!stats.isFile()) {
                log.warn(`Path is not a file: ${filePath}`);
                return false;
            }
            if (stats.size === 0) {
                log.warn(`File is empty: ${filePath}`);
                return false;
            }
            // Try to read first few bytes to check if file is accessible
            await fs.promises.access(filePath, fs.constants.R_OK);
            return true;
        } catch (err) {
            log.warn(`File validation failed for ${filePath}: ${err}`);
            return false;
        }
    }

    protected async getMapNameFromFile(filePath: string) {
        // First validate the file
        if (!(await this.validateMapFile(filePath))) {
            throw new Error(`Map file validation failed: ${filePath}`);
        }

        try {
            const parsedMap = await this.ultraSimpleMapParser.parseMap(filePath);
            if (!parsedMap.springName || parsedMap.springName.trim() === "") {
                throw new Error(`Parsed map has empty or invalid springName: ${filePath}`);
            }
            return parsedMap.springName;
        } catch (err) {
            // Add more context to the error
            const errorMessage = err instanceof Error ? err.message : String(err);
            const enhancedError = new Error(`Failed to parse map file ${filePath}: ${errorMessage}`);
            if (err instanceof Error) {
                enhancedError.cause = err;
            }
            throw enhancedError;
        }
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
        const isInstalled = this.mapNameFileNameLookup[springName] !== undefined;
        console.log(`[DEBUG] isVersionInstalled(${springName}): ${isInstalled}, lookup:`, this.mapNameFileNameLookup[springName]);
        return isInstalled;
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

    public async scanMaps(): Promise<void> {
        await this.initLookupMaps();

        // Emit events for all installed maps
        Object.keys(this.mapNameFileNameLookup).forEach((mapName) => {
            if (this.mapNameFileNameLookup[mapName]) {
                this.onMapAdded.dispatch(mapName);
            }
        });
    }

    public async uninstallVersion(version: MapData) {
        for (const mapsDir of MAPS_PATHS) {
            const mapFile = path.join(mapsDir, version.filename);
            // Only delete from writable directories
            if (this.isInWritableDirectory(mapFile)) {
                await fs.promises.rm(mapFile, { force: true });
                log.debug(`Map removed from writable directory: ${version.springName}`);
            } else if (this.isInAssetsDirectory(mapFile)) {
                log.warn(`Attempted to delete map from assets directory, skipping: ${version.springName}`);
                // Don't delete from assets directory - it's read-only
            }
        }
    }
}

export const mapContentAPI = new MapContentAPI();
