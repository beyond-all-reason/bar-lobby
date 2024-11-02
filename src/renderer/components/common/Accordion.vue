<template>
    <Accordion v-bind="$attrs" />
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
