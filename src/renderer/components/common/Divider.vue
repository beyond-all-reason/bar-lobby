<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Divider v-bind="$props" />
</template>

<script lang="ts" setup>
import Divider, { DividerProps } from "primevue/divider";

export type Props = DividerProps;

defineProps<Props>();
</script>

<style lang="scss" scoped>
.p-divider {
    &:before {
        border-left-width: 1px;
        border-left-color: rgba(255, 255, 255, 0.1);
    }
}
</style>
