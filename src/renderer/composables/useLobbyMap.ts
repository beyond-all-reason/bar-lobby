// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ref, watch } from "vue";
import { MapData } from "@main/content/maps/map-data";
import { db } from "@renderer/store/db";
import { lobbyStore } from "@renderer/store/lobby.store";

/**
 * The MapData for the active lobby's map, or undefined if there is no lobby or the map isn't in the database.
 */
export function useLobbyMap() {
    const map = ref<MapData>();

    watch(
        () => lobbyStore.activeLobby?.mapName,
        async (mapName) => {
            const loadedMap = mapName ? await db.maps.get(mapName) : undefined;
            // Ignore stale lookups if the map changed while we were waiting.
            if (lobbyStore.activeLobby?.mapName === mapName) {
                map.value = loadedMap;
            }
        },
        { immediate: true }
    );

    return map;
}
