<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Range :modelValue="value" :min="min" :max="max" range @update:modelValue="onUpdate" />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import Range from "@renderer/components/controls/Range.vue";
import type { LobbyRange } from "@shared/lobby-list-query";

// A handle left at either end of the slider means no limit on that side, so the bounds are only
// what the slider can show, not a cap on what matches.
const props = defineProps<{
    modelValue?: LobbyRange;
    min: number;
    max: number;
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: LobbyRange | undefined): void;
}>();

const value = computed(() => [props.modelValue?.min ?? props.min, props.modelValue?.max ?? props.max]);

function onUpdate(input: number | number[]) {
    if (!Array.isArray(input)) return;
    const [low, high] = input;
    const range: LobbyRange = {};
    if (low > props.min) range.min = low;
    if (high < props.max) range.max = high;
    emit("update:modelValue", range.min === undefined && range.max === undefined ? undefined : range);
}
</script>
