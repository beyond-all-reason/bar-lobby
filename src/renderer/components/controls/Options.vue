<template>
    <Control class="options">
        <SelectButton v-bind="$attrs">
            <template v-slot:option="scope"><slot name="option" v-bind="scope" /></template>
        </SelectButton>
    </Control>
</template>

<script lang="ts" setup>
//https://primefaces.org/primevue/selectbutton

import SelectButton from "primevue/selectbutton";

import Control from "@renderer/components/controls/Control.vue";
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
        flex-grow: 1;
        &:not(:last-child) {
            box-shadow: 1px 0 0 0 rgba(255, 255, 255, 0.1);
            z-index: 2;
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
    }
}
</style>
