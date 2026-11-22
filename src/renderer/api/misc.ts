// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";

export const miscApi = {
    getNewsRssFeed: (numberOfNews: number) => ipcCall("misc:getNewsRssFeed", () => window.misc.getNewsRssFeed(numberOfNews)),
    getDevlogRssFeed: (numberOfNews: number) => ipcCall("misc:getDevlogRssFeed", () => window.misc.getDevlogRssFeed(numberOfNews)),
};
