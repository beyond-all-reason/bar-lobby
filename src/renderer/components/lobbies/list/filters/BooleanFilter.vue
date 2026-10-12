<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Checkbox
        :label="label"
        :modelValue="modelValue === true"
        @update:modelValue="(checked: boolean) => emit('update:modelValue', checked || undefined)"
    />
</template>

<script lang="ts" setup>
import Checkbox from "@renderer/components/controls/Checkbox.vue";

defineProps<{
    modelValue?: boolean;
    label: string;
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: true | undefined): void;
}>();
</script>
