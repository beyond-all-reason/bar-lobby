// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";

export const engineApi = {
    downloadEngine: (version?: string) => ipcCall("engine:downloadEngine", () => window.engine.downloadEngine(version)),
};
