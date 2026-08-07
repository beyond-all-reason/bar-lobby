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
import { calcChecksum, holdChecksums } from "@main/utils/checksums";

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

    // Only writer of the springName lookups. Our own downloads and removals need it visible the moment
    // they return; the watcher calls it for files the user added or deleted behind our back.
    public syncMaps(): Promise<void> {
        return this.serialise(() => this.reconcileMaps());
    }

    // One piece of work at a time, never inside a pass that started earlier: a reconcile that already
    // listed the directory cannot report a later change, and identifying an archive holds it open, so a
    // removal overlapping a reconcile fails on Windows.
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
                // May be a download still being written - leave it for a later pass.
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
        const wanted = springNames.filter((springName) => !this.isVersionInstalled(springName));
        if (wanted.length === 0) return;

        const downloadInfo = await this.downloadContent("map", wanted);
        removeFromArray(this.currentDownloads, downloadInfo);
        await this.syncMaps();
        this.onDownloadComplete.dispatch(downloadInfo);
    }

    public async downloadMap(springName: string) {
        return this.downloadMaps([springName]);
    }

    public async uninstallVersion(version: MapData | string) {
        const springName = typeof version === "string" ? version : version.springName;
        const fileName = typeof version === "string" ? this.mapNameFileNameLookup[springName] : version.filename;

        if (!fileName) {
            throw new Error(`No installed map file for: ${springName}`);
        }

        await this.serialise(() =>
            holdChecksums(async () => {
                for (const mapsDir of getMapsPaths()) {
                    await fs.promises.rm(path.join(mapsDir, fileName), { force: true });
                }
            })
        );
        await this.syncMaps();
    }
}

export const mapProvider = new MapProvider();
