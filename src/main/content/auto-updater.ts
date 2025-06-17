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

export type UpdateFileInfo = {
    blockMapSize: number | null;
    readonly isAdminRightsRequired: boolean | null;
    readonly sha512: string;
    size: number | null;
    url: string;
};

export type UpdateInfo = {
    readonly version: string;
    releaseName: string | null;
    releaseNotes: string | Array<ReleaseNoteInfo> | null;
    releaseDate: string;
    readonly files: Array<UpdateFileInfo>;
    readonly minimumSystemVersion: string | null;
    readonly stagingPercentage: number;
};

export class AutoUpdaterAPI extends Downloader {
    private updateInfo?: UpdateInfo;
    private intialized: boolean = false;
    public readonly currentVersion: string = autoUpdater.currentVersion;

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

    public get updateInformation(): UpdateInfo | null {
        return this.updateInfo ?? null;
    }

    public async checkForUpdates(): Promise<boolean> {
        if (!this.intialized) return false;
        return await new Promise<boolean>((resolve) => {
            autoUpdater.on("update-available", (info) => {
                this.updateInfo = info as UpdateInfo;
                resolve(true);
            });

            autoUpdater.on("update-not-available", (info) => {
                this.updateInfo = info as UpdateInfo;
                resolve(false);
            });

            autoUpdater.on("error", (error, message) => {
                log.error(error, `Error downloading update. ${message}`);
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

            autoUpdater.on("update-downloaded", (info) => {
                this.updateInfo = info as UpdateInfo;
                resolve();
            });

            autoUpdater.on("error", (error, message) => {
                log.error(error, `Error downloading update. ${message}`);
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
