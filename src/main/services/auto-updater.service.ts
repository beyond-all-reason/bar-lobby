// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcMain } from "@main/typed-ipc";
import { autoUpdaterAPI } from "@main/content/auto-updater";

// Examples: https://github.com/iffy/electron-updater-example/blob/master/main.js
async function init() {
    autoUpdaterAPI.init();
}

function registerIpcHandlers() {
    ipcMain.handle("autoUpdater:checkForUpdates", async () => {
        return await autoUpdaterAPI.checkForUpdates();
    });

    ipcMain.handle("autoUpdater:downloadUpdate", async () => {
        return await autoUpdaterAPI.downloadUpdate();
    });

    ipcMain.handle("autoUpdater:quitAndInstall", () => {
        autoUpdaterAPI.quitAndInstall();
    });

    ipcMain.handle("autoUpdater:installUpdates", () => {
        autoUpdaterAPI.installUpdates();
    });
}

const autoUpdaterService = {
    init,
    registerIpcHandlers,
};

export default autoUpdaterService;
