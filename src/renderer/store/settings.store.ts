// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Settings } from "@main/services/settings.service";
import { reactive } from "vue";

export const settingsStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & Settings);

export const settingsUpdates = {
    loaded(settings: Settings) {
        Object.assign(settingsStore, settings);
    },
    initialized() {
        settingsStore.isInitialized = true;
    },
    uiScaleNudged(scale: number | null) {
        settingsStore.uiScale = scale;
    },
    windowStateChanged({ maximized, size }: { maximized: boolean; size: { width: number; height: number } | null }) {
        settingsStore.maximized = maximized;
        if (!size) return;

        settingsStore.windowWidth = size.width;
        settingsStore.windowHeight = size.height;
    },
};
