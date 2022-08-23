<template>
    <Control class="options">
        <SelectButton v-bind="$attrs" />
    </Control>
</template>

<script lang="ts" setup>
//https://primefaces.org/primevue/selectbutton

import SelectButton from "primevue/selectbutton";

import Control from "@/components/inputs/Control.vue";
</script>

<style lang="scss" scoped>
.options {
    align-items: unset;
    &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.1);
    }
}
:deep(.p-selectbutton) {
    display: flex;
    flex-direction: row;
    gap: 1px;
    .p-button {
        height: 100%;
        padding: 0 7px;
        position: relative;
        overflow: unset;
        &:not(:last-child):after {
            @extend .fullsize;
            top: 0;
            background: rgba(255, 255, 255, 0.2);
            width: 1px;
            right: -1px;
        }
        &:not(.p-highlight) {
            background: rgba(0, 0, 0, 0.2);
            color: rgba(255, 255, 255, 0.6);
        }
    }
    .p-highlight,
    .p-button:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #fff;
        text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.6);
        box-shadow: inset 1px 1px 0 rgba(0, 0, 0, 0.1), inset -1px -1px 0 rgba(0, 0, 0, 0.1);
    }
}
</style>
