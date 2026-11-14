// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { customLobbiesSchema } from "@main/json/model/custom-lobbies";

import { ipcMain } from "@main/typed-ipc";
import path from "path";

const customLobbiesStore = new FileStore<typeof customLobbiesSchema>(path.join(CONFIG_PATH, "custom-lobbies.json"), customLobbiesSchema);

async function init() {
    await customLobbiesStore.init();
}

function getCustomLobbies() {
    return customLobbiesStore.model;
}

async function updateCustomLobbies(data: Partial<CustomLobbiesPreferences>) {
    return await customLobbiesStore.update(data);
}

function registerIpcHandlers() {
    ipcMain.handle("customLobbies:get", () => getCustomLobbies());
    ipcMain.handle("customLobbies:update", (_, data: Partial<CustomLobbiesPreferences>) => updateCustomLobbies(data));
}

export type CustomLobbiesPreferences = typeof customLobbiesStore.model;
export const customLobbiesService = {
    init,
    registerIpcHandlers,
};
