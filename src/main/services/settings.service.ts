// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { settingsSchema } from "@main/json/model/settings";
import { toRaw } from "vue";
import { configService } from "@main/services/config.service";

import { ipcMain } from "@main/typed-ipc";
import path from "path";

const settingsStore = new FileStore<typeof settingsSchema>(path.join(CONFIG_PATH, "settings.json"), settingsSchema);

async function init() {
    await settingsStore.init();
    // Custom server list is a local setting, so it's not part of the config file. If we have a lobby server set by an env var, we want to include that
    // value in the custom server list so it can be seen in the client properly. This pushes the value to the custom server list if needed.
    if (process.env.BAR_LOBBY_LOBBY_SERVER) {
        if (
            !toRaw(settingsStore.model.customServerList).includes(process.env.BAR_LOBBY_LOBBY_SERVER) &&
            !toRaw(configService.getConfig().defaultServers).includes(process.env.BAR_LOBBY_LOBBY_SERVER)
        ) {
            settingsStore.update({ customServerList: [...settingsStore.model.customServerList, process.env.BAR_LOBBY_LOBBY_SERVER] });
        }
    }
}

function getSettings() {
    return settingsStore.model;
}

async function updateSettings(data: Partial<typeof settingsSchema>) {
    return await settingsStore.update(data);
}

function toggleFullscreen() {
    settingsStore.update({ fullscreen: !settingsStore.model.fullscreen });
}

function registerIpcHandlers() {
    ipcMain.handle("settings:get", () => getSettings());
    ipcMain.handle("settings:update", (_, data: Partial<Settings>) => updateSettings(data));
    ipcMain.handle("settings:toggleFullscreen", () => toggleFullscreen());
}

export type Settings = typeof settingsStore.model;
export const settingsService = {
    init,
    registerIpcHandlers,
    getSettings,
    updateSettings,
};
