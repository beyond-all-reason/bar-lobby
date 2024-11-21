<template>
    <div class="flex-col gap-md">
        <div class="terrain-container gap-md">
            <IconFilterCheckbox v-for="terrain in terrainOptions" v-model:checked="terrainFilters[terrain]" v-bind:key="terrain">
                <TerrainIcon :terrain="terrain" class="lg" />
            </IconFilterCheckbox>
        </div>
        <div class="flex-row gap-md">
            <div class="terrain-container water gap-md">
                <IconFilterCheckbox v-for="terrain in waterOptions" v-model:checked="terrainFilters[terrain]" v-bind:key="terrain">
                    <TerrainIcon :terrain="terrain" class="lg" />
                </IconFilterCheckbox>
            </div>
            <div class="terrain-container layout gap-md">
                <IconFilterCheckbox v-for="terrain in layoutOptions" v-model:checked="terrainFilters[terrain]" v-bind:key="terrain">
                    <TerrainIcon :terrain="terrain" class="lg" />
                </IconFilterCheckbox>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { type Terrain } from "@main/content/maps/map-metadata";
import IconFilterCheckbox from "@renderer/components/maps/filters/IconFilterCheckbox.vue";
import TerrainIcon from "@renderer/components/maps/filters/TerrainIcon.vue";
import { mapsStore } from "@renderer/store/maps.store";
const { filters } = mapsStore;
const { terrain: terrainFilters } = filters;

const terrainOptions: Terrain[] = [
    "acidic",
    "alien",
    "ice",
    "lava",
    "space",
    "asteroid",
    "desert",
    "forests",
    "grassy",
    "industrial",
    "jungle",
    "metal",
    "ruins",
    "swamp",
    "tropical",
    "wasteland",
];
const waterOptions: Terrain[] = ["shallows", "sea", "island", "water"];
const layoutOptions: Terrain[] = ["chokepoints", "asymmetrical", "flat", "hills"];
</script>

<style lang="scss" scoped>
.terrain-container {
    display: grid;
    grid-template-columns: repeat(4, max-content);

    &.water,
    &.layout {
        grid-template-columns: repeat(2, max-content);
    }
}
</style>
