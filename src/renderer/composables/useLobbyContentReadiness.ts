// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, watch } from "vue";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { mapsStore } from "@renderer/store/maps.store";

/**
 * Tracks whether the active lobby's map, game and engine are installed, and keeps the server told whether
 * this client is ready: ready once all three are installed, not ready while any is missing.
 */
export function useLobbyContentReadiness() {
    const isMapNeeded = computed(() => (lobbyStore.activeLobby ? !mapsStore.availableMapNames.has(lobbyStore.activeLobby.mapName) : false));
    const isGameNeeded = computed(() => (lobbyStore.activeLobby ? !gameStore.availableGameVersions.has(lobbyStore.activeLobby.gameVersion) : false));
    const isEngineNeeded = computed(() => (lobbyStore.activeLobby ? !enginesStore.availableEngineVersions.some((e) => e.id === lobbyStore.activeLobby!.engineVersion && e.installed) : false));
    const isContentMissing = computed(() => isMapNeeded.value || isGameNeeded.value || isEngineNeeded.value);

    watch(
        () => (lobbyStore.activeLobby ? !isContentMissing.value : undefined),
        (isReady) => {
            if (isReady !== undefined) lobby.requestUpdateClientStatus({ isReady });
        },
        { immediate: true }
    );

    return { isMapNeeded, isContentMissing };
}
