// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { settingsSchema } from "@main/json/model/settings";
import { configService } from "@main/services/config.service";
import { syncAlphaTest } from "@shared/alpha-test";
import { toRaw } from "vue";

import { ipcMain } from "@main/typed-ipc";
import path from "path";

const settingsStore = new FileStore<typeof settingsSchema>(path.join(CONFIG_PATH, "settings.json"), settingsSchema);

let lobbyServerChangedOnInit = false;

async function init() {
    await settingsStore.init();
    if (configService.getConfig().defaultServers && settingsStore.model.lobbyServer === "") {
        settingsStore.update({ lobbyServer: toRaw(configService.getConfig().defaultServers)![0] });
    }

    // Decided here rather than in the renderer so the server is settled before any session is restored.
    const previousServer = settingsStore.model.lobbyServer;
    const settings = { ...settingsStore.model, customServerList: [...settingsStore.model.customServerList] };
    syncAlphaTest(settings, configService.getConfig().alphaTest, toRaw(configService.getConfig().defaultServers));
    await settingsStore.update(settings);
    lobbyServerChangedOnInit = settings.lobbyServer !== previousServer;
}

// The stored credentials were issued by the server in use before, and are no good to the new one.
// A switch made in the renderer signs out by itself, but one made here happens before it is listening.
function didLobbyServerChangeOnInit() {
    return lobbyServerChangedOnInit;
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
    didLobbyServerChangeOnInit,
};
