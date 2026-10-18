// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ContentRef } from "@main/content/content-ref";
import { ipcCall } from "@renderer/api/ipc-call";

export const contentApi = {
    missing: (refs: ContentRef[]) => ipcCall("content:missing", () => window.content.missing(refs)),
    preloadPool: () => ipcCall("content:preloadPool", () => window.content.preloadPool()),
};
