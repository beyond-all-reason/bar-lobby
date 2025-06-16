// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BarIpcWebContents, ipcMain } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { app } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;

const log = logger("auto-updater.service.ts");

// Examples: https://github.com/iffy/electron-updater-example/blob/master/main.js
async function init() {
    if (app.isPackaged || process.env.NODE_ENV === "production") {
        log.info("Initializing Auto-Updater Service");

        autoUpdater.logger = log;

        autoUpdater.autoInstallOnAppQuit = true;

        // autoUpdater.on("checking-for-update", () => {
        //     log.info("Checking for updates...");
        // });

        // autoUpdater.on("update-available", (info) => {
        //     log.info(`Update available: ${info.version}`);
        // });

        // autoUpdater.on("update-not-available", (info) => {
        //     log.info(`Update not available: ${info.version}`);
        // });

        // autoUpdater.on("error", (err) => {
        //     log.error(`Error trying to update: ${err.message}`);
        // });

        // autoUpdater.on("download-progress", (progressObj) => {
        //     log.info(`Download progress: ${progressObj.percent}/100`);
        // });

        // autoUpdater.on("update-downloaded", (info) => {
        //     log.info(`Update downloaded: ${info.version}`);
        // });

        // await autoUpdater.checkForUpdatesAndNotify(); // this will automatically install updates once the app quits
    }
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    autoUpdater.on("checking-for-update", () => {
        webContents.send("autoUpdater:checkingForUpdate");
    });

    autoUpdater.on("update-available", (info) => {
        webContents.send("autoUpdater:updateAvailable");
    });

    autoUpdater.on("update-not-available", (info) => {
        webContents.send("autoUpdater:updateNotAvailable");
    });

    autoUpdater.on("error", (err) => {
        webContents.send("autoUpdater:error");
    });

    autoUpdater.on("download-progress", (progressObj) => {
        webContents.send("downloads:update:progress", {
            type: "update",
            name: "client-update",
            currentBytes: progressObj.transferred,
            totalBytes: progressObj.total,
        });
    });

    autoUpdater.on("update-downloaded", (info) => {
        webContents.send("downloads:update:complete");
    });

    ipcMain.handle("autoUpdater:checkForUpdates", async () => {
        await autoUpdater.checkForUpdates();
    });

    ipcMain.handle("autoUpdater:quitAndInstall", () => {
        autoUpdater.quitAndInstall();
    });
}

const autoUpdaterService = {
    init,
    registerIpcHandlers,
};

export default autoUpdaterService;
