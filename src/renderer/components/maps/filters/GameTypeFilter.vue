<template>
    <div class="game-type-container gap-md">
        <IconFilterCheckbox
            v-for="gameType in gameTypeOptions"
            v-model:checked="gameTypeFilters[gameType]"
            v-bind:key="gameType"
            class="game-type-option"
        >
            <div>{{ /^\D.*/.test(gameType) ? gameType.toUpperCase() : gameType }}</div>
        </IconFilterCheckbox>
    </div>
</template>

<script setup lang="ts">
import type { GameType } from "@main/content/maps/map-metadata";
import IconFilterCheckbox from "@renderer/components/maps/filters/IconFilterCheckbox.vue";
import { mapsStore } from "@renderer/store/maps.store";
const { filters } = mapsStore;
const { gameType: gameTypeFilters } = filters;

const gameTypeOptions: GameType[] = [
    "1v1",
    "1v1v1",
    "2v2",
    "2v2v2",
    "2v2v2v2",
    "3v3",
    "3v3v3v3",
    "4v4",
    "4v4v4",
    "4v4v4v4",
    "5v5",
    "6v6",
    "6v6v6v6",
    "7v7",
    "7v7v7v7",
    "8v8",
    "8v8v8v8",
    "ffa",
    "pve",
];
</script>

<style lang="scss" scoped>
.game-type-container {
    display: flex;
    flex-flow: row wrap;
}
.game-type-option {
    padding: 6px;
    flex-grow: 0;
}
</style>
