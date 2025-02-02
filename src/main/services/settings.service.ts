import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { settingsSchema } from "@main/json/model/settings";

import { ipcMain } from "electron";
import path from "path";

const settingsStore = new FileStore<typeof settingsSchema>(path.join(CONFIG_PATH, "settings.json"), settingsSchema, {
    fullscreen: true,
    displayIndex: 0,
    skipIntro: false,
    sfxVolume: 5,
    musicVolume: 5,
    loginAutomatically: true,
    devMode: false,
    battlesHideInProgress: false,
    battlesHidePvE: false,
    battlesHideLocked: false,
    battlesHideEmpty: true,
});

async function init() {
    await settingsStore.init();
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
    ipcMain.handle("settings:update", (_, data: Partial<typeof settingsSchema>) => updateSettings(data));
    ipcMain.handle("settings:toggleFullscreen", () => toggleFullscreen());
}

export type Settings = typeof settingsStore.model;
export const settingsService = {
    init,
    registerIpcHandlers,
    getSettings,
    updateSettings,
};
