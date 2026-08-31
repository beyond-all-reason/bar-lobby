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
    watch(
        settingsStore,
        () => {
            window.settings.updateSettings(toRaw(settingsStore));
        },
        { deep: true }
    );
    // Registration order is apply order, and a size arriving while the window is still
    // fullscreen or maximised is ignored, so those two come first.
    watch(
        () => settingsStore.fullscreen,
        () => {
            window.mainWindow.setFullscreen(settingsStore.fullscreen);
        }
    );
    watch(
        () => settingsStore.maximized,
        () => {
            window.mainWindow.setMaximized(settingsStore.maximized);
        }
    );
    watch(
        () => [settingsStore.windowWidth, settingsStore.windowHeight],
        () => {
            window.mainWindow.setSize(settingsStore.windowWidth, settingsStore.windowHeight);
        }
    );
    watch(
        () => settingsStore.uiScale,
        () => {
            window.mainWindow.setUiScale(settingsStore.uiScale);
        }
    );
    watch(
        () => settingsStore.displayIndex,
        () => {
            window.mainWindow.setDisplay(settingsStore.displayIndex);
        }
    );

    // The zoom shortcuts work the new scale out in main and leave the storing to here.
    window.mainWindow.onUiScaleNudged((scale) => {
        settingsStore.uiScale = scale;
    });

    // The window resizes itself when dragged or moved to a smaller display, so the setting
    // follows it rather than only driving it.
    window.mainWindow.onWindowStateChanged(({ maximized, size }) => {
        settingsStore.maximized = maximized;
        if (!size) return;

        settingsStore.windowWidth = size.width;
        settingsStore.windowHeight = size.height;
    });
    settingsStore.isInitialized = true;
}
