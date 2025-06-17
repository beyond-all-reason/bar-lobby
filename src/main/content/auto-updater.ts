// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Downloader } from "@main/content/abstract-content";
import { DownloadInfo } from "@main/content/downloads";
import { logger } from "@main/utils/logger";
import { app } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;

const log = logger("auto-updater.ts");

export type ReleaseNoteInfo = {
    readonly version: string;
    readonly note: string | null;
};

export type UpdateInfo = {
    version: string;
    releaseName: string | null;
    releaseNotes: string | Array<ReleaseNoteInfo> | null;
    releaseDate: string;
};

export class AutoUpdaterAPI extends Downloader {
    private updateInfo?: UpdateInfo;
    private intialized: boolean = false;

    public async init() {
        log.info("Initializing AutoUpdaterAPI");
        if (!app.isPackaged) {
            log.info("App is not packaged. Skipping initializaion");
            return this;
        }
        autoUpdater.autoDownload = false;
        autoUpdater.logger = log;
        autoUpdater.autoInstallOnAppQuit = true;
        this.intialized = true;
        return this;
    }

    public async checkForUpdates(): Promise<boolean> {
        if (!this.intialized) return false;
        return await new Promise<boolean>((resolve) => {
            autoUpdater.on("update-available", (info) => {
                this.updateInfo = {
                    version: info.version,
                    releaseName: info.releaseName,
                    releaseNotes: info.releaseNotes,
                    releaseDate: info.releaseDate,
                } as UpdateInfo;
                resolve(true);
            });

            autoUpdater.on("update-not-available", () => {
                resolve(false);
            });

            autoUpdater.on("error", () => {
                log.error("Error downloading update");
                resolve(false);
            });

            autoUpdater.checkForUpdates();
        });
    }

    public async downloadUpdate(): Promise<void> {
        if (!this.intialized) return;
        return await new Promise<void>((resolve) => {
            autoUpdater.on("download-progress", (progressInfo) => {
                this.downloadProgress({
                    type: "update",
                    name: this.updateInfo?.version,
                    currentBytes: progressInfo.transferred,
                    totalBytes: progressInfo.total,
                } as DownloadInfo);
            });

            autoUpdater.on("update-downloaded", () => {
                resolve();
            });

            autoUpdater.on("error", (error) => {
                log.error(error, "Error downloading update");
                resolve();
            });

            autoUpdater.downloadUpdate();
        });
    }

    public quitAndInstall(): void {
        autoUpdater.quitAndInstall();
    }
}

export const autoUpdaterAPI = new AutoUpdaterAPI();
