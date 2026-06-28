// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { configSchema, envVarsMap } from "@main/json/model/config";
import { Value } from "@sinclair/typebox/value";
import path from "path";
import { logger } from "@main/utils/logger";
import { ipcMain } from "@main/typed-ipc";

const log = logger("config.service.ts");

const configStore = new FileStore<typeof configSchema>(path.join(CONFIG_PATH, "config.json"), configSchema);

async function init() {
    await configStore.init();
    await fetchConfig();
    await assignEnvVars();
}

async function assignEnvVars() {
    const env = process.env;
    for (const [key, value] of Object.entries(envVarsMap)) {
        if (env[value] !== undefined) {
            await configStore.update({ [key]: env[value] });
            log.info(`Config ${key} set to ${value} = ${env[value]}`);
        }
    }
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

/**
 * Fetch the latest configuration from the remote URL and update the local config store.
 * Note that env vars will be used to override the config values if they are set, including remote config values.
 */
async function fetchConfig() {
    try {
        const response = await fetch(getConfig().configUrl);
        if (!response.ok) {
            throw Error(`${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!Value.Check(configSchema, data)) {
            for (const err of Value.Errors(configSchema, data)) {
                log.error(`Config error: ${err.path} ${err.message} but received ${err.value}`);
            }
            throw Error("Fetched config does not match schema");
        }
        await configStore.update(data);
    } catch (err) {
        if (err instanceof Error) {
            log.error(`Error fetching config: ${err.message}`);
        } else {
            log.error(err);
        }
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
