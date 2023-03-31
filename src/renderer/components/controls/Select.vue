<template>
    <Control class="select" v-bind="$props">
        <Dropdown v-bind="$attrs" filterPlaceholder="Search" :autoFilterFocus="true" :autoOptionFocus="true" :resetFilterOnHide="true">
            <template v-for="(_, name) in ($slots as {})" #[name]="slotData">
                <slot :name="name" v-bind="slotData || {}" />
            </template>
        </Dropdown>
    </Control>
</template>

<script lang="ts" setup>
// https://primefaces.org/primevue/dropdown
import Dropdown, { DropdownProps } from "primevue/dropdown";

import Control from "@/components/controls/Control.vue";

export interface Props extends DropdownProps {
    disabled?: boolean;
    label?: string;
}

const props = defineProps<Props>();
</script>

<style lang="scss">
.select {
    align-self: center;
    width: 100%;
    overflow: hidden;
}
.p-dropdown {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    padding: 5px 10px;
    width: 100%;
    overflow: hidden;
    &-panel {
        background: #111;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transform: translateX(-1px);
        box-sizing: content-box;
        z-index: 15;
        .p-inputtext {
            border: none;
            border-bottom: 1px solid #333;
            background: #222;
            padding: 5px 10px;
        }
    }
    &-empty-message,
    &-item {
        color: #eee;
        padding: 5px 10px;
    }
    &-item:hover,
    &-item.p-highlight,
    &-item.p-focus {
        color: #000;
        background: #eee;
        text-shadow: none;
    }
    &-filter-icon {
        right: 10px;
    }
    &.p-inputwrapper {
        gap: 10px;
    }
}
</style>
