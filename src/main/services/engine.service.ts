// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { contentAPI } from "@main/content/content-api";
import { EngineVersion } from "@main/content/engine/engine-version";
import { configService } from "@main/services/config.service";
import { ipcMain } from "@main/typed-ipc";

function registerIpcHandlers() {
    ipcMain.handle("engine:listAvailableVersions", () => contentAPI.engineVersions());
    ipcMain.handle("engine:downloadEngine", (_, version?: string) => contentAPI.ensure([{ type: "engine", id: version ?? configService.getConfig().defaultEngineVersion }]));
    ipcMain.handle("engine:isVersionInstalled", (_, id: string) => contentAPI.isPresent({ type: "engine", id }));
    ipcMain.handle("engine:uninstallVersion", (_, version: EngineVersion) => contentAPI.remove([{ type: "engine", id: version.id }]));
}

const engineService = {
    registerIpcHandlers,
};

export default engineService;
