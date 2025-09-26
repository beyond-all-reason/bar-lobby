<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Control class="number">
        <PrimeVueInputNumber v-bind="$attrs" @input="$emit('input', $event)" @update:modelValue="$emit('update:modelValue', $event)" />
    </Control>
</template>

<script lang="ts" setup>
import { InputNumberProps } from "primevue/inputnumber";
import { computed, ref } from "vue";

import Control from "@renderer/components/controls/Control.vue";
import PrimeVueInputNumber from "@renderer/components/primevue/PrimeVueInputNumber.vue";

defineProps<InputNumberProps>();
defineEmits<{
    (event: "update:modelValue", value: number): void;
    (event: "input", value: { originalEvent: Event; value: number; formattedValue: string }): void;
}>();

const max = ref(100);
const maxInputWidth = computed(() => `${max.value.toString().length + 1}ch`);
</script>

<style lang="scss" scoped>
:deep(.p-inputtext) {
    padding: 0 10px;
    width: v-bind(maxInputWidth);
}
:deep(.p-button) {
    margin-right: 5px;
}
</style>
