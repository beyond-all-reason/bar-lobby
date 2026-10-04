// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import { app, dialog } from "electron";
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

// A config file given on the command line wins outright; no remote fetch is needed.
let localConfig: Static<typeof configSchema> | undefined;

async function init() {
    await configStore.init();
    localConfig = await readConfigOverride();
    if (localConfig) {
        await configStore.update(localConfig);
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

    // An invalid file is never applied. The user chooses whether to quit and fix it, or carry on
    // as if none was given, remote fetch included.
    const configPath = path.resolve(process.cwd(), parsedArgs.values.config.toString());
    try {
        const data = JSON.parse(await fs.readFile(configPath, "utf-8"));
        if (!Value.Check(updateConfigSchema, data)) {
            for (const err of Value.Errors(updateConfigSchema, data)) {
                log.error(`Config error: ${err.path} ${err.message} : ${err.value}`);
            }
            throw new Error("Provided config file does not match schema");
        }
        log.info(`Using config file: ${configPath}, remote config will not be fetched`);
        return Value.Cast(configSchema, data);
    } catch (err) {
        log.error(`Provided config file is invalid: ${configPath}`, err);
        const choice = dialog.showMessageBoxSync({
            type: "warning",
            title: "Invalid config override",
            message: "The config file given with --config is invalid and cannot be used.",
            detail: `${configPath}\n\n${err instanceof Error ? err.message : String(err)}\n\nSee the log for details. Continuing will use the remote, saved, or default config instead.`,
            buttons: ["Quit", "Continue without override"],
            defaultId: 0,
            cancelId: 0,
            noLink: true,
        });
        if (choice === 0) {
            log.info("Quitting so the config override can be fixed");
            app.exit(1);
            return undefined;
        }
        log.error(`*** WARNING: your --config override was NOT applied. Client is using remote, saved, or defaults! ***`);
        return undefined;
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
