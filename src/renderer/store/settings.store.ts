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

export async function initSettingsStore() {
    if (settingsStore.isInitialized) {
        console.warn("Settings store is already initialized, skipping initialization.");
        return;
    }
    const currentSettings = await window.settings.getSettings();
    Object.assign(settingsStore, currentSettings);
    settingsStore.isInitialized = true;
    watch(
        settingsStore,
        () => {
            window.settings.updateSettings(toRaw(settingsStore));
        },
        { deep: true }
    );
    watch(
        () => settingsStore.fullscreen,
        () => {
            window.mainWindow.setFullscreen(settingsStore.fullscreen);
        }
    );
    watch(
        () => settingsStore.size,
        () => {
            window.mainWindow.setSize(settingsStore.size);
        }
    );
}
