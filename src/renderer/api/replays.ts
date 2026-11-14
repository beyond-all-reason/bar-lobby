// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";

export const replaysApi = {
    searchOnlineByPlayer: (username: string, limit: number) => ipcCall("replays:searchOnlineByPlayer", () => window.replays.searchOnlineByPlayer(username, limit)),
    getOnline: (replayId: string) => ipcCall("replays:getOnline", () => window.replays.getOnline(replayId)),
};
