<route lang="json">
{ "meta": { "title": "Maps", "order": 1, "transition": { "name": "slide-left" }, "offine": true } }
</route>

<template>
    <div>
        <h1>Maps</h1>
        <div class="sort-options flex-row gap-md">
            <div class="sort-dropdown">
                <Select
                    model-value="Name"
                    v-model="sortMethod"
                    :options="sortMethods"
                    label="Sort By"
                    @update:model-value="(value: any) => sortBy(value)"
                />
            </div>

        </div>
        <div class="map-list">
            <div class="maps">
                <MapListCard v-for="map in filteredMaps" :map="map"/>
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
 * - Searchable
 * - Sortable
 * - Filterable
 * - Paginated
 */

import { computed, ref } from "vue";
import Select from "@/components/controls/Select.vue";

import MapListCard from "@/components/maps/MapListCard.vue";

enum SortMethod {
    Name = "Name",
    Size = "Size",
}

const sortMethods = ref(["Name", "Size"]);
const sortMethod = ref("Name");
const filteredMaps = computed(() => {
    const maps = Array.from(api.content.maps.installedMaps);

    switch (sortMethod.value) {
        case SortMethod.Name:
            maps.sort((a, b) => {
                return a.friendlyName.localeCompare(b.friendlyName);
            });
            break;
        case SortMethod.Size:
            maps.sort((a, b) => {
                return a.width * a.height - b.width * b.height;
            })
    }
    return maps;
});

function sortBy(method: SortMethod) {
    console.log('sortby', method);
    sortMethod.value = method;
}

</script>

<style lang="scss" scoped>
:global(.view--multiplayer-custom > .panel > .content) {
    overflow-y: scroll;
}

.map-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 15px;
}

.sort-options {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 15px;
    padding-bottom: 15px;
    padding-top: 15px;
}

.sort-dropdown {
    width: 200px;
}

.filters {
    & > div {
        background: linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0%, rgba(0 0 0 / 0.3) 100%);

        &:hover {
            background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 0%, rgba(0 0 0 / 0.2) 100%);
        }
    }
}

:deep(.row) {
    display: grid;
    grid-template-columns: 40px 28px 2fr 70px 2fr 170px 90px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%);

    &:last-child {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    &:not(.filters):hover {
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.2);
    }

    & > div {
        display: block;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        padding: 6px 10px;
        border-left: 1px solid rgba(255, 255, 255, 0.1);

        &:last-child {
            border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
    }
}

.maps {
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
}
</style>
