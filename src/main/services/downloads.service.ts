// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { autoUpdaterAPI } from "@main/content/auto-updater";
import { DownloadInfo } from "@main/content/downloads";
import { engineContentAPI } from "@main/content/engine/engine-content";
import { gameContentAPI } from "@main/content/game/game-content";
import { mapContentAPI } from "@main/content/maps/map-content";
import { BarIpcWebContents } from "@main/typed-ipc";

function registerIpcHandlers(webContents: BarIpcWebContents) {
    engineContentAPI.onDownloadStart.add((downloadInfo) => {
        webContents.send("downloads:engine:start", downloadInfo);
    });
    engineContentAPI.onDownloadComplete.add((downloadInfo) => {
        webContents.send("downloads:engine:complete", downloadInfo);
    });
    engineContentAPI.onDownloadProgress.add((downloadInfo) => {
        webContents.send("downloads:engine:progress", downloadInfo);
    });
    engineContentAPI.onDownloadFail.add((downloadInfo) => {
        webContents.send("downloads:engine:fail", downloadInfo);
    });

    gameContentAPI.onDownloadStart.add((downloadInfo) => {
        webContents.send("downloads:game:start", downloadInfo);
    });
    gameContentAPI.onDownloadComplete.add((downloadInfo) => {
        webContents.send("downloads:game:complete", downloadInfo);
    });
    gameContentAPI.onDownloadProgress.add((downloadInfo) => {
        webContents.send("downloads:game:progress", downloadInfo);
    });
    gameContentAPI.onDownloadFail.add((downloadInfo) => {
        webContents.send("downloads:game:fail", downloadInfo);
    });
    gameContentAPI.onDownloadRetry.add((downloadInfo) => {
        webContents.send("downloads:game:retry", downloadInfo);
    });

    mapContentAPI.onDownloadStart.add((downloadInfo) => {
        webContents.send("downloads:map:start", downloadInfo);
    });
    mapContentAPI.onDownloadComplete.add((downloadInfo) => {
        webContents.send("downloads:map:complete", downloadInfo);
    });
    mapContentAPI.onDownloadProgress.add((downloadInfo) => {
        webContents.send("downloads:map:progress", downloadInfo);
    });
    mapContentAPI.onDownloadFail.add((downloadInfo) => {
        webContents.send("downloads:map:fail", downloadInfo);
    });
    mapContentAPI.onDownloadRetry.add((downloadInfo) => {
        webContents.send("downloads:map:retry", downloadInfo);
    });

    autoUpdaterAPI.onDownloadProgress.add((downloadInfo) => {
        webContents.send("downloads:update:progress", downloadInfo);
    });
}

const downloads: Map<string, DownloadInfo> = new Map();

function registerProgressHandler(mainWindow: Electron.CrossProcessExports.BrowserWindow) {
    const apiList = [engineContentAPI, gameContentAPI, mapContentAPI, autoUpdaterAPI];
    apiList.forEach((api) => {
        api.onDownloadStart.add((downloadInfo) => {
            downloads.set(downloadInfo.name, downloadInfo);
            updateProgressBar(mainWindow);
        });
        api.onDownloadComplete.add((downloadInfo) => {
            downloads.delete(downloadInfo.name);
            updateProgressBar(mainWindow);
        });
        api.onDownloadProgress.add((downloadInfo) => {
            downloads.set(downloadInfo.name, downloadInfo);
            updateProgressBar(mainWindow);
        });
        api.onDownloadFail.add((downloadInfo) => {
            downloads.delete(downloadInfo.name);
            updateProgressBar(mainWindow);
        });
    });
}

function updateProgressBar(mainWindow: Electron.CrossProcessExports.BrowserWindow) {
    // If we have no active downloads, clear the progress bar.
    if (downloads.size == 0) {
        mainWindow.setProgressBar(-1);
        return;
    }
    // Get the total progress of all downloads and the number of downloads.
    let totalProgress = 0;
    downloads.forEach((d) => {
        totalProgress += d.progress;
    });
    // Set the progress percent to the average progress of all downloads.
    mainWindow.setProgressBar(totalProgress / downloads.size);
}

const downloadsService = {
    registerIpcHandlers,
    registerProgressHandler,
};

export default downloadsService;
