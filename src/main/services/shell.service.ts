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
    ipcMain.handle("shell:openStateDir", () => shell.openPath(STATE_PATH));
    ipcMain.handle("shell:openAssetsDir", () => shell.openPath(ASSETS_PATH));
    ipcMain.handle("shell:openSettingsFile", () => shell.openPath(path.join(CONFIG_PATH, "settings.json")));
    ipcMain.handle("shell:openStartScript", () => shell.openPath(path.join(WRITE_DATA_PATH, "script.txt")));
    ipcMain.handle("shell:openReplaysDir", () => shell.openPath(REPLAYS_PATH));
    ipcMain.handle("shell:showReplayInFolder", (_event, fileName: string) => shell.showItemInFolder(path.join(REPLAYS_PATH, fileName)));

    // Mod-related
    ipcMain.handle("shell:openModFolder", (_event, modPath: string) => {
        console.log("Opening mod folder:", modPath);
        return shell.openPath(modPath);
    });
    ipcMain.handle("shell:openModRepository", (_event, repository: string) => {
        const url = `https://github.com/${repository}`;
        shell.openExternal(url);
    });

    // External
    ipcMain.handle("shell:openInBrowser", (_event, url) => openInBrowser(url));
}

export const shellService = {
    registerIpcHandlers,
};
