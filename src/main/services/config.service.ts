// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { configSchema, updateConfigSchema, TUpdateConfigSchema } from "@main/json/model/config";
import { Value } from "@sinclair/typebox/value";
import path from "path";
import { logger } from "@main/utils/logger";
import { ipcMain } from "@main/typed-ipc";

const log = logger("config.service.ts");

const configStore = new FileStore<typeof configSchema>(path.join(CONFIG_PATH, "config.json"), configSchema);

async function init() {
    await configStore.init();
    await fetchConfig();
    await checkForConfigOverride();
}

async function checkForConfigOverride() {
    // Load the config file from the argument provided during launch, if there was one provided.
    const configArg = process.argv.find((arg) => arg.startsWith("--config="));
    let configPath = "";

    if (configArg) {
        const rawPath = configArg.slice(configArg.indexOf("=") + 1);
        configPath = path.resolve(process.cwd(), rawPath);
        log.info(`Using config file: ${configPath}`);
        const data = JSON.parse(await fs.readFile(configPath, "utf-8"));
        if (!Value.Check(configSchema, data)) {
            for (const err of Value.Errors(configSchema, data)) {
                log.error(`Config error: ${err.path} ${err.message} : ${err.value}`);
            }
            throw Error("Provided config file does not match schema");
        }
        await configStore.update(data);
    }
}
/**
 * Get the current config values. Note that in Vue arrays have to be wrapped in toRaw() or else access will fail.
 * @returns The current configuration values as properties
 */
function getConfig() {
    return configStore.model;
}

async function updateConfig(data: TUpdateConfigSchema) {
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
        if (!Value.Check(updateConfigSchema, data)) {
            for (const err of Value.Errors(updateConfigSchema, data)) {
                log.error(`Config error: ${err.path} ${err.message} : ${err.value}`);
            }
            throw Error("Fetched config does not match schema");
        }
        log.info(`Fetched config successfully from ${getConfig().configUrl}`);
        const mergedConfig = Value.Cast(configSchema, data);
        await configStore.update(mergedConfig);
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
