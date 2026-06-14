// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { CONFIG_PATH } from "@main/config/app";
import { FileStore } from "@main/json/file-store";
import { configSchema } from "@main/json/model/config";
import path from "path";

const configStore = new FileStore<typeof configSchema>(path.join(CONFIG_PATH, "config.json"), configSchema);

async function init() {
    await configStore.init();
}

function getConfig() {
    return configStore.model;
}

async function updateConfig(data: Partial<typeof configSchema>) {
    return await configStore.update(data);
}

export type Config = typeof configStore.model;
export const configService = {
    init,
    getConfig,
    updateConfig,
};
