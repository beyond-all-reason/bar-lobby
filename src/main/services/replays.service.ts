// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Replay } from "@main/content/replays/replay";
import { replayContentAPI } from "@main/content/replays/replay-content";
import { getOnlineReplay, searchOnlineReplaysByPlayer } from "@main/content/replays/online-replays";
import { ipcMain, BarIpcWebContents } from "@main/typed-ipc";

async function init() {
    await replayContentAPI.init();
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    ipcMain.handle("replays:sync", (_, replays: string[]) => replayContentAPI.sync(replays));
    ipcMain.handle("replays:delete", (_, fileName: string) => replayContentAPI.deleteReplay(fileName));
    ipcMain.handle("replays:searchOnlineByPlayer", (_, username: string, limit: number) => searchOnlineReplaysByPlayer(username, limit));
    ipcMain.handle("replays:getOnline", (_, replayId: string) => getOnlineReplay(replayId));

    // Events
    replayContentAPI.onReplayCachingStarted.add((filename: string) => {
        webContents.send("replays:replayCachingStarted", filename);
    });
    replayContentAPI.onReplayCached.add((replay: Replay) => {
        webContents.send("replays:replayCached", replay);
    });
    replayContentAPI.onReplayDeleted.add((filename: string) => {
        webContents.send("replays:replayDeleted", filename);
    });
}

const replaysService = {
    init,
    registerIpcHandlers,
};

export default replaysService;
