import { CONFIG_PATH, CONTENT_PATH, REPLAYS_PATH } from "@main/config/app";

import { ipcMain, shell } from "electron";
import path from "path";

export const REPLAY_SERVICE_URL = "https://bar-rts.com/replays";
export const NEWS_SERVICE_URL = "https://www.beyondallreason.info/news";

// Careful with shell.openExternal. https://benjamin-altpeter.de/shell-openexternal-dangers/
function openInBrowser(url: string) {
    if (!["https:", "http:"].includes(new URL(url).protocol)) return;

    // Additional checks to prevent opening arbitrary URLs
    if (![REPLAY_SERVICE_URL, NEWS_SERVICE_URL].some((serviceUrl) => url.startsWith(serviceUrl))) return;
    shell.openExternal(url);
}

function registerIpcHandlers() {
    ipcMain.handle("shell:openConfigDir", () => shell.openPath(CONFIG_PATH));
    ipcMain.handle("shell:openContentDir", () => shell.openPath(CONTENT_PATH));
    ipcMain.handle("shell:openSettingsFile", () => shell.openPath(path.join(CONFIG_PATH, "settings.json")));
    ipcMain.handle("shell:openStartScript", () => shell.openPath(path.join(CONTENT_PATH, "script.txt")));
    ipcMain.handle("shell:openReplaysDir", () => shell.openPath(REPLAYS_PATH));
    ipcMain.handle("shell:showReplayInFolder", (_event, fileName: string) => shell.showItemInFolder(path.join(REPLAYS_PATH, fileName)));

    // External
    ipcMain.handle("shell:openInBrowser", (_event, url) => openInBrowser(url));
}

export const shellService = {
    registerIpcHandlers,
};
