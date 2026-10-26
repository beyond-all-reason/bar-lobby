// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Settings } from "@main/services/settings.service";
import { reactive, readonly } from "vue";

const state = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & Settings);

export const settingsStore = readonly(state);

export const settingsUpdates = {
    loaded(settings: Settings) {
        Object.assign(state, settings);
    },
    initialized() {
        state.isInitialized = true;
    },
    changed(values: Partial<Settings>) {
        Object.assign(state, values);
    },
    windowStateChanged({ maximized, size }: { maximized: boolean; size: { width: number; height: number } | null }) {
        state.maximized = maximized;

        if (!size) return;

        state.windowWidth = size.width;
        state.windowHeight = size.height;
    },
};
