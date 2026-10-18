<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Select
        :modelValue="modelValue ?? ''"
        :options="options"
        optionLabel="label"
        optionValue="value"
        filter
        @update:modelValue="(value: string) => emit('update:modelValue', value || undefined)"
    />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import Select from "@renderer/components/controls/Select.vue";

const props = defineProps<{
    modelValue?: string;
    versions: string[];
    anyLabel: string;
}>();

const emit = defineEmits<{
    (event: "update:modelValue", value: string | undefined): void;
}>();

// Keep the selection listed even if no lobby uses it, so the select doesn't go blank.
const options = computed(() => {
    const versions =
        props.modelValue && !props.versions.includes(props.modelValue) ? [props.modelValue, ...props.versions] : props.versions;
    return [{ label: props.anyLabel, value: "" }, ...versions.map((version) => ({ label: version, value: version }))];
});
</script>
