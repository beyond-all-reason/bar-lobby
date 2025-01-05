<template>
    <PrimeVueTabView v-bind="$attrs">
        <template v-for="(_, name) in $slots" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </PrimeVueTabView>
</template>

<script lang="ts" setup>
// https://primefaces.org/primevue/tabview
import { TabViewProps, TabViewSlots } from "primevue/tabview";
import PrimeVueTabView from "@renderer/components/primevue/PrimeVueTabView.vue";
defineProps<TabViewProps>();
defineSlots<TabViewSlots>();
defineEmits<{
    (e: "update:modelValue", value: number): void;
}>();
</script>

<style lang="scss">
.p-tabview {
    max-height: 100%;
    .p-tabview-nav {
        flex-direction: row;
        background: rgba(0, 0, 0, 0.1);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        justify-content: space-between;
    }
    .p-tabview-nav-link {
        padding: 10px;
        color: rgba(255, 255, 255, 0.4);
        &:hover {
            color: #fff;
        }
    }
    .p-tabview-header {
        display: flex;
        justify-content: center;
        overflow: hidden;
        flex-grow: 1;
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
        overflow-y: auto;
    }
    .p-tabview-panel {
        position: relative;
        padding: 25px;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
    }
}
</style>
