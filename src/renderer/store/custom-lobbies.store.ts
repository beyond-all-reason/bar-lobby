// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { CustomLobbiesPreferences } from "@main/services/custom-lobbies.service";
import { reactive, toRaw, watch } from "vue";
import { resolveLobbyServer } from "@shared/lobby-server";
import { removeDisabledFilters } from "@renderer/logic/lobby-list/filters";
import { configStore } from "@renderer/store/config.store";
import { settingsStore } from "@renderer/store/settings.store";

export const customLobbiesStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & CustomLobbiesPreferences);

export function reconcileTagsServer(preferences: Pick<CustomLobbiesPreferences, "query" | "tagsServer">, server: string) {
    if (preferences.tagsServer === server) return;
    delete preferences.query.filters.tags;
    preferences.tagsServer = server;
}

// Requires the config and settings stores to be initialized.
export async function initCustomLobbiesStore() {
    if (customLobbiesStore.isInitialized) {
        console.warn("Custom lobbies store is already initialized, skipping initialization.");
        return;
    }
    Object.assign(customLobbiesStore, await window.customLobbies.get());
    watch(
        customLobbiesStore,
        () => {
            const { query, tagsServer, autoRefresh } = toRaw(customLobbiesStore);
            window.customLobbies.update({ query, tagsServer, autoRefresh });
        },
        { deep: true }
    );

    // Here rather than on the page so it applies even if the page is never opened.
    watch(
        () => resolveLobbyServer(settingsStore.useDefaultServer, settingsStore.lobbyServerOverride, configStore.defaultServers ?? []),
        (server) => reconcileTagsServer(customLobbiesStore, server),
        { immediate: true }
    );
    watch(
        () => settingsStore.devMode,
        (devMode) => removeDisabledFilters(customLobbiesStore.query.filters, devMode),
        { immediate: true }
    );

    customLobbiesStore.isInitialized = true;
}
