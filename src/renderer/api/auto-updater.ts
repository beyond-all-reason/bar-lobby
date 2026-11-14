// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";

export const autoUpdaterApi = {
    checkForUpdates: () => ipcCall("autoUpdater:checkForUpdates", () => window.autoUpdater.checkForUpdates()),
    downloadUpdate: () => ipcCall("autoUpdater:downloadUpdate", () => window.autoUpdater.downloadUpdate()),
    installUpdates: () => ipcCall("autoUpdater:installUpdates", () => window.autoUpdater.installUpdates()),
};
