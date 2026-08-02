<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Range v-model="range" :min="2" :max="40" range />
</template>

<script setup lang="ts">
import { ref } from "vue";
import Range from "@renderer/components/controls/Range.vue";
import { mapsStore } from "@renderer/store/maps.store";
import { watchThrottled } from "@vueuse/core";

const { filters } = mapsStore;
const range = ref([filters.minPlayers, filters.maxPlayers]);

watchThrottled(
    range,
    (newRange) => {
        filters.minPlayers = newRange[0];
        filters.maxPlayers = newRange[1];
    },
    {
        throttle: 200,
        trailing: true,
    }
);
</script>

<style lang="scss" scoped></style>
