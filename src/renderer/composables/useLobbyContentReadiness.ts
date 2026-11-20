// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, watch } from "vue";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { mapsStore } from "@renderer/store/maps.store";
import { me } from "@renderer/store/me.store";

/**
 * Tracks whether the active lobby's map, game and engine are installed, and while this client is a player keeps the
 * server told whether it is ready: ready once all three are installed, not ready while any is missing.
 */
export function useLobbyContentReadiness() {
    const isMapNeeded = computed(() => (lobbyStore.activeLobby ? !mapsStore.availableMapNames.has(lobbyStore.activeLobby.mapName) : false));
    const isGameNeeded = computed(() => (lobbyStore.activeLobby ? !gameStore.availableGameVersions.has(lobbyStore.activeLobby.gameVersion) : false));
    const isEngineNeeded = computed(() => (lobbyStore.activeLobby ? !enginesStore.availableEngineVersions.some((e) => e.id === lobbyStore.activeLobby!.engineVersion && e.installed) : false));
    const isContentMissing = computed(() => isMapNeeded.value || isGameNeeded.value || isEngineNeeded.value);

    // Readiness is only a player's to report: the server refuses it from spectators, and a spectator who joins a team
    // must send it then, even if their content did not change meanwhile.
    const isPlayer = computed(() => lobbyStore.activeLobby?.players[me.userId] !== undefined);

    watch(
        () => (isPlayer.value ? !isContentMissing.value : undefined),
        (isReady) => {
            if (isReady !== undefined) lobby.requestUpdateClientStatus({ isReady });
        },
        { immediate: true }
    );

    return { isMapNeeded, isContentMissing };
}
