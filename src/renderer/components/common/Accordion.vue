<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Accordion v-bind="$attrs">
        <slot />
    </Accordion>
</template>

<script lang="ts" setup>
// https://primefaces.org/primevue/accordion
import Accordion from "primevue/accordion";
</script>

<style lang="scss">
.p-accordion {
    display: flex;
    flex-direction: column;
    gap: 10px;
    &-tab {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    &-header-link {
        display: flex;
        flex-direction: row;
        gap: 5px;
    }
}
</style>
