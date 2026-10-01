// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { configSchema, updateConfigSchema, TUpdateConfigSchema } from "@main/json/model/config";
import { Value } from "@sinclair/typebox/value";
import type { Static } from "@sinclair/typebox";
import path from "path";
import { logger } from "@main/utils/logger";
import { ipcMain } from "@main/typed-ipc";
import { parseArgs } from "node:util";

const log = logger("config.service.ts");

const configStore = new FileStore<typeof configSchema>(path.join(CONFIG_PATH, "config.json"), configSchema);

// A config file given on the command line wins outright. Fetching would let a live remote config change
// state a developer is testing against, the alpha test prompt included. Like the remote one it may be
// partial, and anything it leaves out takes the built-in default rather than the cached remote value.
let localConfig: Static<typeof configSchema> | undefined;

async function init() {
    await configStore.init();
    localConfig = await readConfigOverride();
    if (localConfig) {
        await replaceConfig(localConfig);
    } else {
        await fetchConfig();
    }
}

async function readConfigOverride() {
    const parsedArgs = parseArgs({
        args: process.argv.slice(1),
        options: { config: { type: "string" } },
        strict: false,
    });
    if (!parsedArgs.values.config) return undefined;

    const configPath = path.resolve(process.cwd(), parsedArgs.values.config.toString());
    log.info(`Using config file: ${configPath}, remote config will not be fetched`);
    const data = JSON.parse(await fs.readFile(configPath, "utf-8"));
    if (!Value.Check(updateConfigSchema, data)) {
        for (const err of Value.Errors(updateConfigSchema, data)) {
            log.error(`Config error: ${err.path} ${err.message} : ${err.value}`);
        }
        throw new Error("Provided config file does not match schema");
    }
    return Value.Cast(configSchema, data);
}

// The store merges, so an optional property the new config leaves out would otherwise survive from the
// cached one. An alpha test that has ended must actually go away.
async function replaceConfig(data: Static<typeof configSchema>) {
    if (data.alphaTest === undefined) {
        delete configStore.model.alphaTest;
    }
    await configStore.update(data);
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
    if (localConfig) return;
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
            throw new Error("Fetched config does not match schema");
        }
        log.info(`Fetched config successfully from ${getConfig().configUrl}`);
        const mergedConfig = Value.Cast(configSchema, data);
        await replaceConfig(mergedConfig);
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
