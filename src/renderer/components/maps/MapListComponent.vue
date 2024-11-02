<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <div class="flex-row gap-md">
            <SearchBox v-model="searchVal" />
            <Select v-model="sortMethod" :options="sortMethods" label="Sort By" optionLabel="label" />
        </div>

        <div class="flex-col flex-grow fullheight">
            <div class="scroll-container" style="overflow-y: scroll">
                <div class="maps">
                    <TransitionGroup name="maps-list">
                        <MapOverviewCard
                            v-for="map in maps"
                            :key="map.scriptName"
                            :map="map"
                            :friendlyName="map.friendlyName"
                            @click="mapSelected(map)"
                        />
                    </TransitionGroup>
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
import { MapData } from "@main/content/maps/map-data";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";

type SortMethod = { label: string; dbKey: string };

const sortMethods: SortMethod[] = [
    { label: "Name", dbKey: "friendlyName" },
    { label: "Size", dbKey: "width" },
];
const sortMethod: Ref<SortMethod> = ref(sortMethods.at(0));
const searchVal = ref("");
const emit = defineEmits<{
    (event: "map-selected", map: MapData): void;
}>();

const maps = useDexieLiveQueryWithDeps([searchVal, sortMethod], () =>
    db.maps
        .filter((map) => map.friendlyName.toLocaleLowerCase().includes(searchVal.value.toLocaleLowerCase()))
        .sortBy(sortMethod.value.dbKey)
);

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
