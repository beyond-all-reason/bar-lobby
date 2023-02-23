<template>
    <PrimeVueTabView v-bind="$attrs">
        <template v-for="(_, name) in $slots" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </PrimeVueTabView>
</template>

<script lang="ts" setup>
// https://primefaces.org/primevue/tabview

import PrimeVueTabView from "@/components/primevue/PrimeVueTabView.vue";
</script>

<style lang="scss">
.p-tabview {
    max-height: 100%;
    .p-tabview-nav {
        flex-direction: row;
        background: rgba(0, 0, 0, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .p-tabview-nav-link {
        padding: 10px;
        color: rgba(255, 255, 255, 0.4);
        &:hover {
            color: #fff;
        }
    }
    .p-tabview-header {
        width: 100%;
        display: flex;
        justify-content: center;
        overflow: hidden;
        &:not(:first-child) {
            box-shadow: inset 1px 0 0 0 rgba(255, 255, 255, 0.1);
        }
        .p-tabview-nav-link {
            width: 100%;
            display: flex;
            justify-content: center;
        }
        &.close {
            width: unset;
            box-shadow: unset;
        }
    }
    .p-highlight .p-tabview-nav-link {
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
    }
    .p-tabview-panels {
        min-height: calc(100% - 39px);
        max-height: calc(100% - 39px);
        overflow-y: auto;
    }
    .p-tabview-panel {
        position: relative;
    }
}
</style>
