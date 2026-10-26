// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { mainWindowApi } from "@renderer/api/main-window";
import { settingsApi } from "@renderer/api/settings";
import { settingsStore, settingsUpdates } from "@renderer/store/settings.store";
import { toRaw, watch } from "vue";

export async function initSettingsLogic() {
    if (settingsStore.isInitialized) {
        console.warn("Settings store is already initialized, skipping initialization.");
        return;
    }

    settingsUpdates.loaded(await settingsApi.get());

    watch(
        settingsStore,
        () => {
            settingsApi.update(toRaw(settingsStore));
        },
        { deep: true }
    );
    // Registration order is apply order, and a size arriving while the window is still
    // fullscreen or maximised is ignored, so those two come first.
    watch(
        () => settingsStore.fullscreen,
        () => {
            mainWindowApi.setFullscreen(settingsStore.fullscreen);
        }
    );
    watch(
        () => settingsStore.maximized,
        () => {
            mainWindowApi.setMaximized(settingsStore.maximized);
        }
    );
    watch(
        () => [settingsStore.windowWidth, settingsStore.windowHeight],
        () => {
            mainWindowApi.setSize(settingsStore.windowWidth, settingsStore.windowHeight);
        }
    );
    watch(
        () => settingsStore.uiScale,
        () => {
            mainWindowApi.setUiScale(settingsStore.uiScale);
        }
    );
    watch(
        () => settingsStore.displayIndex,
        () => {
            mainWindowApi.setDisplay(settingsStore.displayIndex);
        }
    );

    // The zoom shortcuts work the new scale out in main and leave the storing to here.
    mainWindowApi.onUiScaleNudged(settingsUpdates.uiScaleNudged);

    // The window resizes itself when dragged or moved to a smaller display, so the setting
    // follows it rather than only driving it.
    mainWindowApi.onWindowStateChanged(settingsUpdates.windowStateChanged);

    settingsUpdates.initialized();
}
