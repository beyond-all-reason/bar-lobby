// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { autoUpdaterAPI } from "@main/content/auto-updater";
import { DownloadInfo } from "@main/content/downloads";
import { engineContentAPI } from "@main/content/engine/engine-content";
import { gameContentAPI } from "@main/content/game/game-content";
import { mapContentAPI } from "@main/content/maps/map-content";
import { BarIpcWebContents } from "@main/typed-ipc";

const downloads: Map<string, DownloadInfo> = new Map();

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

function registerProgressHandler(mainWindow: Electron.CrossProcessExports.BrowserWindow) {
    engineContentAPI.onDownloadStart.add((downloadInfo) => {
        downloads.set(downloadInfo.name, downloadInfo);
        updateProgressBar(mainWindow);
    });
    engineContentAPI.onDownloadComplete.add((downloadInfo) => {
        downloads.delete(downloadInfo.name);
        updateProgressBar(mainWindow);
    });
    engineContentAPI.onDownloadProgress.add((downloadInfo) => {
        downloads.set(downloadInfo.name, downloadInfo);
        updateProgressBar(mainWindow);
    });
    engineContentAPI.onDownloadFail.add((downloadInfo) => {
        downloads.delete(downloadInfo.name);
        updateProgressBar(mainWindow);
    });

    gameContentAPI.onDownloadStart.add((downloadInfo) => {
        downloads.set(downloadInfo.name, downloadInfo);
        updateProgressBar(mainWindow);
    });
    gameContentAPI.onDownloadComplete.add((downloadInfo) => {
        downloads.delete(downloadInfo.name);
        updateProgressBar(mainWindow);
    });
    gameContentAPI.onDownloadProgress.add((downloadInfo) => {
        downloads.set(downloadInfo.name, downloadInfo);
        updateProgressBar(mainWindow);
    });
    gameContentAPI.onDownloadFail.add((downloadInfo) => {
        downloads.delete(downloadInfo.name);
        updateProgressBar(mainWindow);
    });

    mapContentAPI.onDownloadStart.add((downloadInfo) => {
        downloads.set(downloadInfo.name, downloadInfo);
        updateProgressBar(mainWindow);
    });
    mapContentAPI.onDownloadComplete.add((downloadInfo) => {
        downloads.delete(downloadInfo.name);
        updateProgressBar(mainWindow);
    });
    mapContentAPI.onDownloadProgress.add((downloadInfo) => {
        downloads.set(downloadInfo.name, downloadInfo);
        updateProgressBar(mainWindow);
    });
    mapContentAPI.onDownloadFail.add((downloadInfo) => {
        downloads.delete(downloadInfo.name);
        updateProgressBar(mainWindow);
    });

    autoUpdaterAPI.onDownloadStart.add((downloadInfo) => {
        downloads.set(downloadInfo.name, downloadInfo);
        updateProgressBar(mainWindow);
    });
    autoUpdaterAPI.onDownloadComplete.add((downloadInfo) => {
        downloads.delete(downloadInfo.name);
        updateProgressBar(mainWindow);
    });
    autoUpdaterAPI.onDownloadProgress.add((downloadInfo) => {
        downloads.set(downloadInfo.name, downloadInfo);
        updateProgressBar(mainWindow);
    });
    autoUpdaterAPI.onDownloadFail.add((downloadInfo) => {
        downloads.delete(downloadInfo.name);
        updateProgressBar(mainWindow);
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
    let downloadCount = 0;
    downloads.forEach((d) => {
        totalProgress += d.progress;
        downloadCount += 1;
    });
    // Set the progress percent to the average progress of all downloads.
    mainWindow.setProgressBar(totalProgress / downloadCount);
}

const downloadsService = {
    registerIpcHandlers,
    registerProgressHandler,
};

export default downloadsService;
