<template>
    <Control class="select">
        <Dropdown v-bind="$attrs" filterPlaceholder="Search">
            <template v-for="(_, slot) of $slots" #[slot]="scope">
                <slot :name="slot" v-bind="scope" />
            </template>
        </Dropdown>
    </Control>
</template>

<script lang="ts" setup>
// https://primefaces.org/primevue/dropdown
import Dropdown from "primevue/dropdown";

import Control from "@/components/inputs/Control.vue";
</script>

<style lang="scss">
.select {
    width: 100%;
    align-self: center;
}
.p-dropdown {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    padding: 5px 10px;
    width: 100%;
}
.p-dropdown-panel {
    background: #111;
    border: 1px solid rgba(255, 255, 255, 0.2);
    transform: translateX(-1px);
    box-sizing: content-box;
    z-index: 5;
    .p-inputtext {
        border: none;
        border-bottom: 1px solid #333;
        background: #222;
        padding: 5px 10px;
    }
}
.p-dropdown-empty-message,
.p-dropdown-item {
    color: #eee;
    padding: 5px 10px;
}
.p-dropdown-item:hover,
.p-highlight {
    color: #000;
    background: #eee;
    text-shadow: none;
}
</style>
