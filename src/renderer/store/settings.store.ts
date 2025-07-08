// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Settings } from "@main/services/settings.service";
import { reactive, watch, toRaw } from "vue";

export const settingsStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & Settings);

watch(
    settingsStore,
    () => {
        if (settingsStore.isInitialized) {
            window.settings.updateSettings(toRaw(settingsStore));
        }
    },
    { deep: true }
);

watch(
    () => settingsStore.fullscreen,
    () => window.mainWindow.setFullscreen(settingsStore.fullscreen, settingsStore.size)
);

watch(
    () => settingsStore.size,
    () => window.mainWindow.setSize(settingsStore.size)
);

export async function initSettingsStore() {
    const currentSettings = await window.settings.getSettings();
    Object.assign(settingsStore, currentSettings);
    settingsStore.isInitialized = true;
}
