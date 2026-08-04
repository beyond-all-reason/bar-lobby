// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import * as fs from "fs";
import * as path from "path";

import { MapData } from "@main/content/maps/map-data";
import { logger } from "@main/utils/logger";
import { Signal } from "$/jaz-ts-utils/signal";
import { PrDownloaderAPI } from "@main/content/pr-downloader";
import { getMapsPaths } from "@main/config/app";
import chokidar, { FSWatcher } from "chokidar";
import { UltraSimpleMapParser } from "$/map-parser/ultrasimple-map-parser";
import { removeFromArray } from "$/jaz-ts-utils/object";
import { engineProvider } from "@main/content/engine/engine-provider";
import { calcChecksum, whenChecksumsIdle } from "@main/utils/checksums";

const log = logger("map-provider.ts");

export class MapProvider extends PrDownloaderAPI<string, MapData> {
    public mapNameFileNameLookup: { [springName: string]: string | undefined } = {};
    public fileNameMapNameLookup: { [fileName: string]: string | undefined } = {};

    public readonly onMapAdded: Signal<string> = new Signal();
    public readonly onMapDeleted: Signal<string> = new Signal();

    private watcher?: FSWatcher;
    private mapsWork: Promise<void> = Promise.resolve();

    public override async init() {
        await this.syncMaps();
        await this.startWatchingMapFolder();

        engineProvider.onDownloadComplete.add((downloadInfo) => {
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

    /**
     * Brings the springName lookups in line with what is actually in the maps directories, and reports
     * whatever changed. This is the only thing that mutates them.
     *
     * Reconciling rather than reacting to individual events, because the two things that change the
     * directories cannot both be handled the same way: our own downloads and removals need to be visible
     * the moment they return, while a file the user added or deleted is only ever noticed by the
     * watcher. Both call this instead of each keeping its own idea of what is installed.
     */
    public syncMaps(): Promise<void> {
        return this.serialise(() => this.reconcileMaps());
    }

    /**
     * Runs work against the maps directories one piece at a time, and never inside a pass that started
     * earlier. Both halves matter: a reconcile that has already listed the directory cannot report a
     * change made afterwards, and reading an archive to identify it holds the file open, so a removal
     * overlapping a reconcile fails outright on Windows.
     */
    private serialise<T>(work: () => Promise<T>): Promise<T> {
        const result = this.mapsWork.then(work);
        this.mapsWork = result.then(
            () => undefined,
            (err) => log.error("Maps directory work failed", err)
        );

        return result;
    }

    private async reconcileMaps() {
        const onDisk = new Map<string, string>();

        // toReversed keeps the precedence order: higher precedence visited later, so it wins.
        for (const mapsDir of getMapsPaths().toReversed()) {
            let entries: string[];
            try {
                entries = await fs.promises.readdir(mapsDir);
            } catch {
                continue; // dir may not exist yet (e.g. before first path confirmation)
            }

            for (const fileName of entries.filter((entry) => entry.endsWith(".sd7"))) {
                onDisk.set(fileName, path.join(mapsDir, fileName));
            }
        }

        for (const [fileName, springName] of Object.entries(this.fileNameMapNameLookup)) {
            if (springName === undefined || onDisk.has(fileName)) {
                continue;
            }

            delete this.fileNameMapNameLookup[fileName];
            delete this.mapNameFileNameLookup[springName];
            log.debug(`Map gone: ${springName}`);
            this.onMapDeleted.dispatch(springName);
        }

        for (const [fileName, filePath] of onDisk) {
            if (this.fileNameMapNameLookup[fileName] !== undefined) {
                continue;
            }

            let springName: string;
            try {
                springName = await this.getMapNameFromFile(filePath);
            } catch (err) {
                // Deliberately left alone rather than removed as corrupt: a sync triggered by one
                // finished download can reach another that is still being written, and deleting that
                // would destroy a download in progress. A later pass picks it up once it is complete.
                log.warn(`Could not identify ${filePath} yet: ${err}`);
                continue;
            }

            this.mapNameFileNameLookup[springName] = fileName;
            this.fileNameMapNameLookup[fileName] = springName;
            log.debug(`Map found: ${springName}`);
            this.onMapAdded.dispatch(springName);

            const defaultEngine = engineProvider.getDefaultEngine();
            if (defaultEngine?.installed) {
                calcChecksum(defaultEngine.id, springName);
            }
        }

        log.info(`${Object.keys(this.mapNameFileNameLookup).length} maps installed`);
    }

    ultraSimpleMapParser = new UltraSimpleMapParser();
    protected async getMapNameFromFile(filePath: string) {
        const parsedMap = await this.ultraSimpleMapParser.parseMap(filePath);
        return parsedMap.springName;
    }

    protected async startWatchingMapFolder() {
        await this.watcher?.close();
        this.watcher = chokidar
            .watch(getMapsPaths().slice(), {
                ignoreInitial: true, //ignore the initial scan
                awaitWriteFinish: true, //wait for the file to be fully written before emitting the event
            })
            .on("all", (_event, filepath) => {
                if (!filepath.endsWith("sd7")) {
                    return;
                }

                void this.syncMaps();
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

        const downloadInfo = await this.downloadContent("map", springName);
        removeFromArray(this.currentDownloads, downloadInfo);
        await this.syncMaps();
        this.onDownloadComplete.dispatch(downloadInfo);
    }

    public async uninstallVersion(version: MapData | string) {
        const springName = typeof version === "string" ? version : version.springName;
        const fileName = typeof version === "string" ? this.mapNameFileNameLookup[springName] : version.filename;

        if (!fileName) {
            throw new Error(`No installed map file for: ${springName}`);
        }

        await this.serialise(async () => {
            // A checksum spawned when this map was found keeps the archive open, and nothing new can be
            // queued meanwhile because reconciling runs on this same queue.
            await whenChecksumsIdle();

            for (const mapsDir of getMapsPaths()) {
                await fs.promises.rm(path.join(mapsDir, fileName), { force: true });
            }
        });
        await this.syncMaps();
    }
}

export const mapProvider = new MapProvider();
