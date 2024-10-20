import { CONFIG_PATH, CONTENT_PATH, REPLAYS_PATH } from "@main/config/app";

import { ipcMain, shell } from "electron";
import path from "path";

function registerIpcHandlers() {
    ipcMain.handle("shell:openConfigDir", () => shell.openPath(CONFIG_PATH));
    ipcMain.handle("shell:openContentDir", () => shell.openPath(CONTENT_PATH));
    ipcMain.handle("shell:openSettingsFile", () => shell.openPath(path.join(CONFIG_PATH, "settings.json")));
    ipcMain.handle("shell:openStartScript", () => shell.openPath(path.join(CONTENT_PATH, "script.txt")));
    ipcMain.handle("shell:openReplaysDir", () => shell.openPath(REPLAYS_PATH));
    ipcMain.handle("shell:showReplayInFolder", (_event, fileName: string) => shell.showItemInFolder(path.join(REPLAYS_PATH, fileName)));
    ipcMain.handle("shell:openExternal", (_event, url: string) => shell.openExternal(url));
}

export const shellService = {
    registerIpcHandlers,
};
