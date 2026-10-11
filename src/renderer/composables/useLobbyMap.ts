// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import { MapData } from "@main/content/maps/map-data";
import { db } from "@renderer/store/db";
import { lobbyStore } from "@renderer/store/lobby.store";

/**
 * The MapData for a lobby's map, or undefined if there is no map name or the map isn't in the database.
 * Defaults to the active lobby's map.
 */
export function useLobbyMap(mapName: MaybeRefOrGetter<string | undefined> = () => lobbyStore.activeLobby?.mapName) {
    const map = ref<MapData>();

    watch(
        () => toValue(mapName),
        async (name) => {
            const loadedMap = name ? await db.maps.get(name) : undefined;
            // Ignore stale lookups if the map changed while we were waiting.
            if (toValue(mapName) === name) {
                map.value = loadedMap;
            }
        },
        { immediate: true }
    );

    return map;
}
