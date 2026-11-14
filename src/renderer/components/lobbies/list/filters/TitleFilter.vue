<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Textbox
        :modelValue="modelValue ?? ''"
        @update:modelValue="(value: string) => emit('update:modelValue', value.trim() ? value : undefined)"
    />
</template>

<script lang="ts" setup>
import Textbox from "@renderer/components/controls/Textbox.vue";

defineProps<{
    modelValue?: string;
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: string | undefined): void;
}>();
</script>
