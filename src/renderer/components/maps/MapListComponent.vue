<template>
    <div class="flex-col gap-lg flex-grow fullheight">
        <div class="flex-row gap-md">
            <SearchBox v-model="searchVal" />
            <Select v-model="sortMethod" :options="sortMethods" label="Sort By" />
        </div>

        <div class="flex-col flex-grow fullheight">
            <div class="scroll-container">
                <div class="maps">
                    <MapOverviewCard
                        v-for="(map, i) in filteredMaps"
                        :key="i"
                        :map="map"
                        :friendlyName="map.friendlyName"
                        @click="mapSelected(map)"
                    />
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

import { computed, Ref, ref } from "vue";

import SearchBox from "@/components/controls/SearchBox.vue";
import Select from "@/components/controls/Select.vue";
import MapOverviewCard from "@/components/maps/MapOverviewCard.vue";
import { MapData } from "@/model/cache/map-data";

type SortMethod = "Name" | "Size";

const sortMethods: SortMethod[] = ["Name", "Size"];
const sortMethod: Ref<SortMethod> = ref("Name");
const searchVal = ref("");
const emit = defineEmits<{
    (event: "map-selected", map: MapData): void;
}>();
const filteredMaps = computed(() => {
    let maps = Array.from(api.content.maps.installedVersions);

    if (searchVal.value.length > 0) {
        maps = maps.filter((map: MapData) => {
            return map.friendlyName.toLowerCase().includes(searchVal.value.toLowerCase());
        });
    }

    switch (sortMethod.value) {
        case "Name":
            maps.sort((a, b) => {
                return a.friendlyName.localeCompare(b.friendlyName);
            });
            break;
        case "Size":
            maps.sort((a, b) => {
                return a.width * a.height - b.width * b.height;
            });
    }
    return maps;
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
</style>
