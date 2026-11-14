// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { Config } from "@main/services/config.service";
import { reactive, readonly } from "vue";

const state = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & Config);

// Config is static at runtime; expose a readonly view so the renderer cannot mutate it directly.
export const configStore = readonly(state);

export async function initConfigStore() {
    if (state.isInitialized) {
        console.warn("Config store is already initialized, skipping initialization.");
        return;
    }
    const currentConfig = await window.config.getConfig();
    Object.assign(state, currentConfig);
    state.isInitialized = true;
}
