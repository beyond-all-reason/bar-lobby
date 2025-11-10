// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { STATE_PATH, CONFIG_PATH, WRITE_DATA_PATH, REPLAYS_PATH, ASSETS_PATH } from "@main/config/app";
import { shell } from "electron";
import { ipcMain } from "@main/typed-ipc";
import path from "path";

const REPLAY_SERVICE_URL = "https://bar-rts.com/replays";
const NEWS_SERVICE_URL = "https://www.beyondallreason.info/news";

// Careful with shell.openExternal. https://benjamin-altpeter.de/shell-openexternal-dangers/
function openInBrowser(url: string) {
    if (!["https:", "http:"].includes(new URL(url).protocol)) return;

    // Additional checks to prevent opening arbitrary URLs
    if (![REPLAY_SERVICE_URL, NEWS_SERVICE_URL].some((serviceUrl) => url.startsWith(serviceUrl))) return;
    shell.openExternal(url);
}

function registerIpcHandlers() {
    ipcMain.handle("shell:openStateDir", () => openPath(STATE_PATH));
    ipcMain.handle("shell:openAssetsDir", () => openPath(ASSETS_PATH));
    ipcMain.handle("shell:openSettingsFile", () => openPath(path.join(CONFIG_PATH, "settings.json")));
    ipcMain.handle("shell:openStartScript", () => openPath(path.join(WRITE_DATA_PATH, "script.txt")));
    ipcMain.handle("shell:openReplaysDir", () => openPath(REPLAYS_PATH));
    ipcMain.handle("shell:showReplayInFolder", (_event, fileName: string) => shell.showItemInFolder(path.join(REPLAYS_PATH, fileName)));

    // External
    ipcMain.handle("shell:openInBrowser", (_event, url) => openInBrowser(url));
}

export const shellService = {
    registerIpcHandlers,
};

// Allows us to return an empty string even if shell.openPath has an error string.
function openPath(path: string): string {
    try {
        shell.openPath(path);
    } catch (error) {
        console.error(error);
    }
    return "";
}
