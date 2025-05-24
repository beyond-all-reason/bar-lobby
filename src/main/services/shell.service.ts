import { CONFIG_PATH, DATA_PATH, REPLAYS_PATH } from "@main/config/app";

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
    ipcMain.handle("shell:openConfigDir", () => shell.openPath(CONFIG_PATH));
    ipcMain.handle("shell:openContentDir", () => shell.openPath(DATA_PATH));
    ipcMain.handle("shell:openSettingsFile", () => shell.openPath(path.join(CONFIG_PATH, "settings.json")));
    ipcMain.handle("shell:openStartScript", () => shell.openPath(path.join(DATA_PATH, "script.txt")));
    ipcMain.handle("shell:openReplaysDir", () => shell.openPath(REPLAYS_PATH));
    ipcMain.handle("shell:showReplayInFolder", (_event, fileName: string) => shell.showItemInFolder(path.join(REPLAYS_PATH, fileName)));

    // External
    ipcMain.handle("shell:openInBrowser", (_event, url) => openInBrowser(url));
}

export const shellService = {
    registerIpcHandlers,
};
