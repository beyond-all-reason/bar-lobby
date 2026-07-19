// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { getAssetsPath, getPoolPath } from "@main/config/app";
import * as fs from "fs";
import path from "path";
import { DownloaderHelper } from "node-downloader-helper";
import { logger } from "@main/utils/logger";

import type { DownloadInfo } from "@main/content/downloads";
import { Downloader } from "@main/content/abstract-content";
import { removeFromArray } from "$/jaz-ts-utils/object";
import { GameContentAPI } from "@main/content/game/game-content";
import { extract7z } from "@main/utils/extract-7z";

const log = logger("pool-cdn.ts");

export class PoolCdnDownloader extends Downloader {
    cdnUrl = "https://pool-init.beyondallreason.dev";
    poolDataUrl = `${this.cdnUrl}/data.7z`;

    constructor(gameApi: GameContentAPI) {
        super();
        this.onDownloadStart.add((downloadInfo) => {
            gameApi.onDownloadStart.dispatch(downloadInfo);
        });
        this.onDownloadComplete.add((downloadInfo) => {
            gameApi.onDownloadComplete.dispatch(downloadInfo);
        });
        this.onDownloadProgress.add((downloadInfo) => {
            gameApi.onDownloadProgress.dispatch(downloadInfo);
        });
        this.onDownloadFail.add((downloadInfo) => {
            gameApi.onDownloadFail.dispatch(downloadInfo);
        });
    }

    /**
     * Download and extract pool data from the pool CDN.
     *
     * Will try to reuse an existing archive download if it exists (DownloadHelper will resume download).
     */
    public async preloadPoolData() {
        log.info("Downloading pool data");
        await fs.promises.mkdir(getPoolPath(), { recursive: true });

        const downloadInfo: DownloadInfo = {
            type: "game",
            name: "pool-data",
            currentBytes: 0,
            totalBytes: 1,
            progress: 0,
        };
        this.currentDownloads.push(downloadInfo);
        this.downloadStarted(downloadInfo);

        const dlFilePath = path.join(getAssetsPath(), "data.7z");
        const dl = new DownloaderHelper(this.poolDataUrl, getAssetsPath(), {
            fileName: "data.7z",
            timeout: 10000,
            retry: { maxRetries: 3, delay: 1000 },
            override: true,
            resumeIfFileExists: true,
            resumeOnIncomplete: true,
            removeOnStop: false,
            removeOnFail: false,
        });
        dl.on("start", () => {
            log.info("Pool data download started");
        });
        dl.on("end", () => {
            log.info("Pool data download complete");
        });
        dl.on("error", (error) => {
            console.error("Pool data download failed", error);
            this.downloadFailed(downloadInfo);
        });
        dl.on("progress.throttled", (stats) => {
            const progress = stats.progress.toFixed(2);
            log.debug(`Pool data download progress: ${progress}%`);

            downloadInfo.currentBytes = stats.downloaded;
            downloadInfo.totalBytes = stats.total;
            this.downloadProgress(downloadInfo);
        });

        try {
            await dl.start();
        } finally {
            removeFromArray(this.currentDownloads, downloadInfo);
        }

        downloadInfo.phase = "extracting";
        this.downloadProgress(downloadInfo);

        await extract7z(dlFilePath, getPoolPath());
        log.info("Pool data extracted");

        await fs.promises.rm(dlFilePath);
        log.debug(dlFilePath, "Deleted downloaded pool cdn file");

        this.downloadComplete(downloadInfo);
    }
}
