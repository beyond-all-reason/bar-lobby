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
import { watchThrottled } from "@vueuse/core";

// [min, max] players.
const players = defineModel<[number, number]>({ required: true });
const range = ref([...players.value]);

watchThrottled(
    range,
    (newRange) => {
        players.value = [newRange[0], newRange[1]];
    },
    {
        throttle: 200,
        trailing: true,
    }
);
</script>

<style lang="scss" scoped></style>
