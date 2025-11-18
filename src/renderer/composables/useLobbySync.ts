// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, watch, onUnmounted, ref } from "vue";
import { lobbyStore, lobbyActions } from "@renderer/store/lobby.store";
import { enginesStore } from "@renderer/store/engine.store";
import { db } from "@renderer/store/db";
import { useDexieLiveQuery } from "@renderer/composables/useDexieLiveQuery";
import type { MemberSyncStatus } from "tachyon-protocol/types";

/**
 * Composable that automatically tracks and reports sync status for lobby resources.
 *
 * Monitors:
 * - Map availability
 * - Engine version availability
 * - Game version availability
 * - Mod availability (by gitRef)
 *
 * Automatically sends updates to server when sync status changes.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useLobbySync } from "@renderer/composables/useLobbySync";
 *
 * const { syncStatus, isFullySynced } = useLobbySync();
 * </script>
 *
 * <template>
 *   <div v-if="!isFullySynced">Downloading resources...</div>
 * </template>
 * ```
 */
export function useLobbySync() {
    // Track map installation status reactively
    const mapInstalled = ref<boolean>(false);

    // Get installed game versions reactively
    const installedGameVersions = useDexieLiveQuery(() => db.gameVersions.toArray());

    // Update map status when lobby changes
    watch(
        () => lobbyStore.currentLobby?.mapName,
        async (mapName) => {
            if (!mapName) {
                mapInstalled.value = false;
                return;
            }

            // Check if map exists in live or non-live maps
            const [liveMap, nonLiveMap] = await Promise.all([db.maps.get(mapName), db.nonLiveMaps.get(mapName)]);

            mapInstalled.value = liveMap?.isInstalled || nonLiveMap?.isInstalled || false;
        },
        { immediate: true }
    );

    // Compute current sync status
    const syncStatus = computed<MemberSyncStatus | null>(() => {
        if (!lobbyStore.currentLobby) return null;

        const lobby = lobbyStore.currentLobby;

        return {
            map: mapInstalled.value,
            engine: (enginesStore.availableEngineVersions || []).some((v) => v.id === lobby.engineVersion),
            game: (installedGameVersions.value || []).some((v) => v.gameVersion === lobby.gameVersion),
            mods: lobby.mods
                .filter(() => {
                    // Check if mod is installed
                    // TODO: Implement proper mod tracking by gitRef
                    // For now, just return the gitRef for mods we "have"
                    return false; // Placeholder - needs mod store implementation
                })
                .map((mod) => mod.gitRef),
        };
    });

    // Check if all resources are synced
    const isFullySynced = computed(() => {
        if (!syncStatus.value) return false;
        return syncStatus.value.map && syncStatus.value.engine && syncStatus.value.game && syncStatus.value.mods.length === (lobbyStore.currentLobby?.mods.length ?? 0);
    });

    // Auto-report sync status when it changes
    const stopWatching = watch(
        syncStatus,
        (newStatus) => {
            if (newStatus && lobbyStore.isJoined) {
                lobbyActions.updateSync(newStatus);
            }
        },
        { deep: true }
    );

    // Clean up when component unmounts
    onUnmounted(() => {
        stopWatching();
    });

    return {
        syncStatus,
        isFullySynced,
    };
}
