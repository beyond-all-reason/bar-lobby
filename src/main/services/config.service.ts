// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { configSchema } from "@main/json/model/config";
import { Value } from "@sinclair/typebox/value";
import path from "path";
import { logger } from "@main/utils/logger";
import { ipcMain } from "@main/typed-ipc";

const log = logger("config.service.ts");

const configStore = new FileStore<typeof configSchema>(path.join(CONFIG_PATH, "config.json"), configSchema);

async function init() {
    await configStore.init();
    await fetchConfig();
}

/**
 * Get the current config values. Note that in Vue arrays have to be wrapped in toRaw() or else access will fail.
 * @returns The current configuration values as properties
 */
function getConfig() {
    return configStore.model;
}

async function updateConfig(data: Partial<typeof configSchema>) {
    return await configStore.update(data);
}

async function fetchConfig() {
    try {
        log.info("Fetching config from URL:", getConfig().configUrl);
        const response = await fetch(getConfig().configUrl);
        const data = await response.json();
        if (!Value.Check(configSchema, data)) {
            throw Error("Fetched config does not match configSchema");
        }
        await configStore.update(data);
    } catch (error) {
        log.error(error, "Error fetching config:");
    }
}

function registerIpcHandlers() {
    ipcMain.handle("config:get", () => getConfig());
    ipcMain.handle("config:update", (_, data: Partial<Config>) => updateConfig(data));
    ipcMain.handle("config:fetch", () => fetchConfig());
}

export type Config = typeof configStore.model;
export const configService = {
    init,
    registerIpcHandlers,
    getConfig,
    updateConfig,
    fetchConfig,
};
