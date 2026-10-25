// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Replay } from "@main/replays/replay";
import { replaysAPI } from "@main/replays/replays";
import { getOnlineReplay, searchOnlineReplaysByPlayer } from "@main/replays/online-replays";
import { ipcMain, BarIpcWebContents } from "@main/typed-ipc";

async function init() {
    await replaysAPI.init();
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    ipcMain.handle("replays:sync", (_, replays: string[]) => replaysAPI.sync(replays));
    ipcMain.handle("replays:delete", (_, fileName: string) => replaysAPI.deleteReplay(fileName));
    ipcMain.handle("replays:searchOnlineByPlayer", (_, username: string, limit: number) => searchOnlineReplaysByPlayer(username, limit));
    ipcMain.handle("replays:getOnline", (_, replayId: string) => getOnlineReplay(replayId));

    // Events
    replaysAPI.onReplayCachingStarted.add((filename: string) => {
        webContents.send("replays:replayCachingStarted", filename);
    });
    replaysAPI.onReplayCached.add((replay: Replay) => {
        webContents.send("replays:replayCached", replay);
    });
    replaysAPI.onReplayDeleted.add((filename: string) => {
        webContents.send("replays:replayDeleted", filename);
    });
}

const replaysService = {
    init,
    registerIpcHandlers,
};

export default replaysService;
