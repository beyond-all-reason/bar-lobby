import { Replay } from "@main/content/replays/replay";
import { replayContentAPI } from "@main/content/replays/replay-content";
import { ipcMain } from "electron";

async function init() {
    await replayContentAPI.init();
}

function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
    ipcMain.handle("replays:sync", (_, replays: string[]) => replayContentAPI.sync(replays));
    ipcMain.handle("replays:delete", (_, fileName: string) => replayContentAPI.deleteReplay(fileName));

    // Events
    replayContentAPI.onReplayCachingStarted.add((filename: string) => {
        mainWindow.webContents.send("replays:replayCachingStarted", filename);
    });
    replayContentAPI.onReplayCached.add((replay: Replay) => {
        mainWindow.webContents.send("replays:replayCached", replay);
    });
    replayContentAPI.onReplayDeleted.add((filename: string) => {
        mainWindow.webContents.send("replays:replayDeleted", filename);
    });
}

const replaysService = {
    init,
    registerIpcHandlers,
};

export default replaysService;
