<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullheight scroll-container">
        <div class="flex-col gap-xl filters">
            <div>
                <h6>{{ t("lobby.components.maps.mapFiltersComponent.maxPlayers") }}</h6>
                <MaxPlayersFilter
                    :modelValue="[filters.minPlayers, filters.maxPlayers]"
                    @update:modelValue="([minPlayers, maxPlayers]: [number, number]) => update({ minPlayers, maxPlayers })"
                />
            </div>
            <div>
                <h6>{{ t("lobby.components.maps.mapFiltersComponent.filterBy") }}</h6>
                <FavoritesFilter
                    :modelValue="filters.favoritesOnly"
                    @update:modelValue="(favoritesOnly: boolean) => update({ favoritesOnly })"
                />
                <DownloadedFilter
                    :modelValue="filters.downloadedOnly"
                    @update:modelValue="(downloadedOnly: boolean) => update({ downloadedOnly })"
                />
            </div>
            <div>
                <h6>{{ t("lobby.components.maps.mapFiltersComponent.terrain") }}</h6>
                <TerrainFilter
                    :modelValue="filters.terrain"
                    @update:modelValue="(terrain: MapFilterState['terrain']) => update({ terrain })"
                />
            </div>
            <div>
                <h6>{{ t("lobby.components.maps.mapFiltersComponent.gameType") }}</h6>
                <GameTypeFilter
                    :modelValue="filters.gameType"
                    @update:modelValue="(gameType: MapFilterState['gameType']) => update({ gameType })"
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * Sort by:
 * - name
 * - size
 * - ideal max player count
 * - downloaded
 * - date created or updated
 *
 * Filter by:
 * - name (text search)
 * - map size (min and max, as slider)
 * - max players (min and max, as slider)
 * - game type
 * - terrain (general, water type, & layout)
 */
import GameTypeFilter from "@renderer/components/maps/filters/GameTypeFilter.vue";
import MaxPlayersFilter from "@renderer/components/maps/filters/MaxPlayersFilter.vue";
import TerrainFilter from "@renderer/components/maps/filters/TerrainFilter.vue";
import FavoritesFilter from "@renderer/components/maps/filters/FavoritesFilter.vue";
import DownloadedFilter from "@renderer/components/maps/filters/DownloadedFilter.vue";
import type { MapFilterState } from "@renderer/components/maps/filters/map-filter-state";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

// Caller-owned so each view or modal keeps its own filters.
const filters = defineModel<MapFilterState>("filters", { required: true });

function update(changes: Partial<MapFilterState>) {
    filters.value = { ...filters.value, ...changes };
}
</script>

<style lang="scss" scoped>
.filters {
    padding-right: 10px;
}
</style>
