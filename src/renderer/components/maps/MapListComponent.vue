<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <div class="flex-row gap-md">
            <SearchBox v-model="searchVal" />
            <Select
                v-model="sortMethod"
                :options="sortMethods"
                :label="t('lobby.components.maps.mapListComponents.sortBy')"
                optionLabel="label"
            />
        </div>

        <div class="flex-col flex-grow fullheight">
            <div class="scroll-container" style="overflow-y: scroll" ref="el">
                <div class="maps">
                    <TransitionGroup name="maps-list">
                        <MapOverviewCard v-for="map in maps" :key="map.springName" :map="map" @click="mapSelected(map)" />
                    </TransitionGroup>
                    <div v-if="(maps?.length || 0) <= 0">
                        <h4>{{ t("lobby.components.maps.mapListComponents.noMapsFound") }}</h4>
                        <span>{{ t("lobby.components.maps.mapListComponents.pleaseTryDifferent") }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
/**
 * TODO:
 * - Similar to online map browser
 * - Indicator whether map is installed or not
 * - Easy one click install button
 * - Demo map button that launches a simple offline game on the map
 */
import { Ref, ref } from "vue";

import SearchBox from "@renderer/components/controls/SearchBox.vue";
import Select from "@renderer/components/controls/Select.vue";
import MapOverviewCard from "@renderer/components/maps/MapOverviewCard.vue";
import { type MapData } from "@main/content/maps/map-data";
import type { GameType, Terrain } from "@main/content/maps/map-metadata";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { mapsStore } from "@renderer/store/maps.store";

import { useInfiniteScroll } from "@vueuse/core";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const { filters } = mapsStore;

type SortMethod = { label: string; dbKey: string };

const sortMethods: SortMethod[] = [
    { label: t("lobby.components.maps.mapListComponents.labelName"), dbKey: "displayName" },
    { label: t("lobby.components.maps.mapListComponents.labelSize"), dbKey: "mapWidth" },
];
const sortMethod: Ref<SortMethod | undefined> = ref(sortMethods.at(0));
const searchVal = ref("");
const emit = defineEmits<{
    (event: "map-selected", map: MapData): void;
}>();

const limit = ref(30);
const el = ref<HTMLElement | null>(null);
useInfiniteScroll(
    el,
    () => {
        limit.value += 30;
    },
    { distance: 300, interval: 550 }
);

const maps = useDexieLiveQueryWithDeps([searchVal, sortMethod, limit, filters], () => {
    const { terrain, gameType } = filters;
    const terrainFilters = new Set([...(<Terrain[]>Object.keys(terrain)).filter((key) => !!terrain[key]).map((k) => k)]);
    const gameTypeFilters = new Set([...(<GameType[]>Object.keys(gameType)).filter((key) => gameType[key]).map((k) => k)]);
    return db.maps
        .filter((map) => {
            const favorites = !filters.favoritesOnly || map.isFavorite;
            const downloaded = !filters.downloadedOnly || map.isInstalled;
            return Boolean(
                map.displayName.toLocaleLowerCase().includes(searchVal.value.toLocaleLowerCase()) &&
                    filters.minPlayers <= map.playerCountMax &&
                    filters.maxPlayers >= map.playerCountMax &&
                    (terrainFilters.size === 0 || terrainFilters.isSubsetOf(new Set([...map.terrain]))) &&
                    (gameTypeFilters.size === 0 || !gameTypeFilters.isDisjointFrom(new Set([...map.tags]))) &&
                    favorites &&
                    downloaded
            );
        })
        .limit(limit.value)
        .sortBy(sortMethod.value?.dbKey || "");
});

function mapSelected(map: MapData) {
    emit("map-selected", map);
}
</script>

<style lang="scss" scoped>
.maps {
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    padding-right: 10px;
}

// Transition
.maps-list-move,
.maps-list-enter-active,
.maps-list-leave-active {
    transition: all 0.5s ease;
}
.maps-list-enter-from,
.maps-list-leave-to {
    opacity: 0;
    // transform: translateX(0, 30px);
}
.maps-list-leave-active {
    position: absolute;
}
</style>
