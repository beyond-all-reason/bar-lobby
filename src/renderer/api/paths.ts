// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";

export const pathsApi = {
    selectFolder: () => ipcCall("paths:selectFolder", () => window.paths.selectFolder()),
    changePath: (newPath: string) => ipcCall("paths:changePath", () => window.paths.changePath(newPath)),
    getCurrentAssetsPath: () => ipcCall("paths:getCurrentAssetsPath", () => window.paths.getCurrentAssetsPath()),
};
