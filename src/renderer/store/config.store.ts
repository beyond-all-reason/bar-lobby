// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Config } from "@main/services/config.service";
import { reactive, watch, toRaw } from "vue";

export const configStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & Config);

export async function initConfigStore() {
    if (configStore.isInitialized) {
        console.warn("Config store is already initialized, skipping initialization.");
        return;
    }
    const currentConfig = await window.config.getConfig();
    Object.assign(configStore, currentConfig);
    configStore.isInitialized = true;
    watch(
        configStore,
        () => {
            window.config.updateConfig(toRaw(configStore));
        },
        { deep: true }
    );
}
