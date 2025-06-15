// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

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

        autoUpdater.on("checking-for-update", () => {
            log.info("Checking for updates...");
        });

        autoUpdater.on("update-available", (info) => {
            log.info("Update available");
        });

        autoUpdater.on("update-not-available", (info) => {
            log.info("Update not available");
        });

        autoUpdater.on("error", (err) => {
            log.error("Error trying to update");
        });

        autoUpdater.on("download-progress", (progressObj) => {
            log.info("Download progress");
        });

        autoUpdater.on("update-downloaded", (info) => {
            log.info("Update downloaded");
        });

        await autoUpdater.checkForUpdatesAndNotify(); // this will automatically install updates once the app quits
    }
}

const autoUpdaterService = {
    init,
};

export default autoUpdaterService;