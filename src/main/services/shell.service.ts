// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { STATE_PATH, CONFIG_PATH, WRITE_DATA_PATH, REPLAYS_PATH, getAssetsPath } from "@main/config/app";
import { shell } from "electron";
import { ipcMain } from "@main/typed-ipc";
import path from "path";
import { configService } from "@main/services/config.service";

// Careful with shell.openExternal. https://benjamin-altpeter.de/shell-openexternal-dangers/
function openInBrowser(url: string) {
    if (!["https:", "http:"].includes(new URL(url).protocol)) return;

    // Additional checks to prevent opening arbitrary URLs
    if (![configService.getConfig().replayServiceUrl, configService.getConfig().newsServiceUrl].some((serviceUrl) => url.startsWith(serviceUrl))) return;
    shell.openExternal(url);
}

function registerIpcHandlers() {
    ipcMain.handle("shell:openStateDir", () => shell.openPath(STATE_PATH));
    ipcMain.handle("shell:openAssetsDir", () => shell.openPath(getAssetsPath()));
    ipcMain.handle("shell:openSettingsFile", () => shell.openPath(path.join(CONFIG_PATH, "settings.json")));
    ipcMain.handle("shell:openConfigFile", () => shell.openPath(path.join(CONFIG_PATH, "config.json")));
    ipcMain.handle("shell:openStartScript", () => shell.openPath(path.join(WRITE_DATA_PATH, "script.txt")));
    ipcMain.handle("shell:openReplaysDir", () => shell.openPath(REPLAYS_PATH));
    ipcMain.handle("shell:showReplayInFolder", (_event, fileName: string) => shell.showItemInFolder(path.join(REPLAYS_PATH, fileName)));

    // External
    ipcMain.handle("shell:openInBrowser", (_event, url) => openInBrowser(url));
}

export const shellService = {
    registerIpcHandlers,
};
