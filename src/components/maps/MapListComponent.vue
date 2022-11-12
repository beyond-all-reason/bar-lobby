<template>
    <div>
        <div class="sort-options flex-row gap-md">
            <SearchBox v-model="searchVal" />
            <div class="sort-dropdown">
                <Select v-model="sortMethod" :options="sortMethods" label="Sort By" />
            </div>
        </div>
        <div class="map-list">
            <div class="maps">
                <MapOverviewCard v-for="(map, index) in filteredMaps" :key="index" :map="map" @map-selected="mapSelected" />
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

import { computed, ref } from "vue";

import SearchBox from "@/components/controls/SearchBox.vue";
import Select from "@/components/controls/Select.vue";
import MapOverviewCard from "@/components/maps/MapOverviewCard.vue";
import { MapData } from "@/model/map-data";

enum SortMethod {
    Name = "Name",
    Size = "Size",
}

const sortMethods = ref([SortMethod.Name, SortMethod.Size]);
const sortMethod = ref(SortMethod.Name.valueOf());
const searchVal = ref("");
const emit = defineEmits(["mapSelected"]);
const filteredMaps = computed(() => {
    let maps = Array.from(api.content.maps.installedMaps);

    if (searchVal.value.length > 0) {
        maps = maps.filter((map: MapData) => {
            return map.friendlyName.toLowerCase().includes(searchVal.value.toLowerCase());
        });
    }

    switch (sortMethod.value) {
        case SortMethod.Name:
            maps.sort((a, b) => {
                return a.friendlyName.localeCompare(b.friendlyName);
            });
            break;
        case SortMethod.Size:
            maps.sort((a, b) => {
                return a.width * a.height - b.width * b.height;
            });
    }
    return maps;
});

function mapSelected(map: MapData) {
    emit("mapSelected", map);
}
</script>

<style lang="scss" scoped>
.map-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 15px;
}

.sort-options {
    display: flex;
    flex-direction: row;
    width: 100%;
    gap: 15px;
    padding-bottom: 15px;
    padding-top: 15px;
}

.sort-dropdown {
    width: 200px;
}

.maps {
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
}
</style>
