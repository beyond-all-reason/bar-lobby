<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullheight scroll-container">
        <div class="flex-col gap-xl filters">
            <div>
                <h6>{{ t("lobby.components.maps.mapFiltersComponent.maxPlayers") }}</h6>
                <MaxPlayersFilter />
            </div>
            <div>
                <h6>{{ t("lobby.components.maps.mapFiltersComponent.filterBy") }}</h6>
                <FavoritesFilter />
                <DownloadedFilter />
            </div>
            <div>
                <h6>{{ t("lobby.components.maps.mapFiltersComponent.terrain") }}</h6>
                <TerrainFilter />
            </div>
            <div>
                <h6>{{ t("lobby.components.maps.mapFiltersComponent.gameType") }}</h6>
                <GameTypeFilter />
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
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();
</script>

<style lang="scss" scoped>
.filters {
    padding-right: 10px;
}
</style>
