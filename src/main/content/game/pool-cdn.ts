import { CONTENT_PATH } from "@main/config/app";
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
     * Download and extract pool data from the pool CDN, if pool directory does not exist in content folder.
     *
     * Will try to reuse existing download if it exists (DownloadHelper will resume download).
     */
    public async preloadPoolData() {
        const poolDirPath = path.join(CONTENT_PATH, "pool");
        try {
            await fs.promises.stat(poolDirPath);
            log.debug("Pool folder exists, skipping download");
            return;
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
                console.error("Error checking pool folder", e);
                throw e;
            }
            // Pool folder does not exist, create and continue
            await fs.promises.mkdir(poolDirPath);
        }
        log.info("Pool folder does not exist, downloading pool data");

        const downloadInfo: DownloadInfo = {
            type: "game",
            name: "pool-data",
            currentBytes: 0,
            totalBytes: 1,
        };
        this.currentDownloads.push(downloadInfo);

        const dlFilePath = path.join(CONTENT_PATH, "data.7z");
        const dl = new DownloaderHelper(this.poolDataUrl, CONTENT_PATH, {
            fileName: "data.7z",
            override: true,
            resumeIfFileExists: true,
            resumeOnIncomplete: true,
            removeOnStop: false,
            removeOnFail: false,
        });
        dl.on("start", () => {
            log.info("Pool data download started");
            this.downloadStarted(downloadInfo);
        });
        dl.on("end", () => {
            log.info("Pool data download complete");
            this.downloadComplete(downloadInfo);
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

        await extract7z(dlFilePath, poolDirPath);
        log.info("Pool data extracted");
    }
}
