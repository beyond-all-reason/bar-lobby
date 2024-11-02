<route lang="json5">
{ meta: { title: "Maps", order: 1, transition: { name: "slide-left" }, offine: true } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div class="flex-col fullheight">
                <h1>Installed Maps</h1>
                <MapListComponent @map-selected="onMapSelected" />
            </div>
        </Panel>
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

import { MapData } from "@main/content/maps/map-data";
import Panel from "@renderer/components/common/Panel.vue";
import MapListComponent from "@renderer/components/maps/MapListComponent.vue";
import { useRouter } from "vue-router";

const router = useRouter();

async function onMapSelected(map: MapData) {
    await router.push(`/library/maps/${map.scriptName}`);
}
</script>

<style lang="scss" scoped></style>
