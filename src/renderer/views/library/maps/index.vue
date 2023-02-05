<route lang="json5">
{ meta: { title: "Maps", order: 1, transition: { name: "slide-left" }, offine: true } }
</route>

<template>
    <div>
        <h1>Installed Maps</h1>
        <MapListComponent @map-selected="onMapSelected" />
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

import MapListComponent from "@/components/maps/MapListComponent.vue";
import { MapData } from "@/model/map-data";

function onMapSelected(map: MapData) {
    api.router.push(`/library/maps/${map.scriptName}`);
}
</script>
