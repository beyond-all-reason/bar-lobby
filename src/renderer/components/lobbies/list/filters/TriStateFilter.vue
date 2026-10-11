<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <TriStateCheckbox :label="label" :modelValue="asString" @update:modelValue="onUpdate" />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import TriStateCheckbox from "@renderer/components/controls/TriStateCheckbox.vue";
import type { LobbyTriState } from "@shared/lobby-list-query";

const props = defineProps<{
    modelValue?: LobbyTriState;
    label: string;
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: boolean | undefined): void;
}>();

// TriStateCheckbox speaks in strings.
const asString = computed(() => (props.modelValue === true ? "true" : props.modelValue === false ? "false" : "null"));

function onUpdate(value: "true" | "false" | "null") {
    emit("update:modelValue", value === "null" ? undefined : value === "true");
}
</script>
