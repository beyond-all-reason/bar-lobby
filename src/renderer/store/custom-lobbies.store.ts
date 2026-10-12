// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { CustomLobbiesPreferences } from "@main/services/custom-lobbies.service";
import { reactive, toRaw, watch } from "vue";
import { resolveLobbyServer } from "@shared/lobby-server";
import { removeDisabledFilters } from "@renderer/logic/lobby-list/filters";
import { configStore } from "@renderer/store/config.store";
import { settingsStore } from "@renderer/store/settings.store";

/** The custom lobbies page's saved query and list preferences, from their own file. */
export const customLobbiesStore = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & CustomLobbiesPreferences);

/**
 * Tags come from the server, so a tag chosen on one server means nothing on another. Clears the
 * saved tags when they were chosen on a different server, and records the current one.
 */
export function reconcileTagsServer(preferences: Pick<CustomLobbiesPreferences, "query" | "tagsServer">, server: string) {
    if (preferences.tagsServer === server) return;
    delete preferences.query.filters.tags;
    preferences.tagsServer = server;
}

// Reads the config and settings stores, so those have to be initialized first.
export async function initCustomLobbiesStore() {
    if (customLobbiesStore.isInitialized) {
        console.warn("Custom lobbies store is already initialized, skipping initialization.");
        return;
    }
    Object.assign(customLobbiesStore, await window.customLobbies.get());
    watch(
        customLobbiesStore,
        () => {
            // The file only holds the preferences, not the store's own bookkeeping.
            const { query, tagsServer, autoRefresh } = toRaw(customLobbiesStore);
            window.customLobbies.update({ query, tagsServer, autoRefresh });
        },
        { deep: true }
    );

    // Done here rather than on the page, so they apply even if the page is never opened.
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
