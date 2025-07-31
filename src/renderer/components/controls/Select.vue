<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Control class="select" v-bind="$props">
        <Dropdown
            v-bind="$props"
            :filterPlaceholder="t('lobby.labels.search')"
            :autoFilterFocus="true"
            :autoOptionFocus="true"
            :resetFilterOnHide="true"
            @update:modelValue="handleEvent"
        >
            <slot />
        </Dropdown>
    </Control>
</template>

<script lang="ts" setup>
import Dropdown, { DropdownProps } from "primevue/dropdown";

import Control from "@renderer/components/controls/Control.vue";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

export interface Props extends DropdownProps {
    disabled?: boolean;
    label?: string;
}

defineProps<Props>();

const emit = defineEmits(["update:modelValue"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleEvent(value: any) {
    emit("update:modelValue", value);
}
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
