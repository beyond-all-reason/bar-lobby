<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <ContextMenu ref="contextMenu" :model="model" v-bind="$attrs" @hide="onHide" />
</template>

<script lang="ts">
// Shared by every instance so only one menu is open at a time. PrimeVue's show() stops the contextmenu
// event propagating, so an open menu never hears the right click that opens another and would stay open.
let closeOpenMenu: (() => void) | undefined;
</script>

<script lang="ts" setup>
// https://primefaces.org/primevue/contextmenu

import ContextMenu, { ContextMenuProps } from "primevue/contextmenu";
import { onBeforeUnmount, ref } from "vue";

// model is declared as a prop, so Vue excludes it from $attrs and it must be forwarded explicitly
const { model } = defineProps<ContextMenuProps>();
defineEmits<{
    (e: "show", event: Event): void;
    (e: "hide"): void;
    (e: "toggle", event: Event): void;
}>();

const contextMenu = ref<ContextMenu>();

defineExpose<{
    hide: ContextMenu["show"];
    show: ContextMenu["show"];
    toggle: ContextMenu["show"];
}>({
    hide,
    show,
    toggle,
});

function hide(): void {
    contextMenu.value!.hide();
}

function show(event: Event): void {
    if (closeOpenMenu !== hide) closeOpenMenu?.();
    closeOpenMenu = hide;
    contextMenu.value!.show(event);
}

function toggle(event: Event): void {
    if (closeOpenMenu === hide) hide();
    else show(event);
}

function onHide(): void {
    if (closeOpenMenu === hide) closeOpenMenu = undefined;
}

onBeforeUnmount(onHide);
</script>

<style lang="scss">
.p-contextmenu,
.p-submenu-list {
    border: 1px solid rgb(51, 51, 51);
    box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.4);
    font-weight: 500;
}
.p-submenu-list {
    margin-top: -1px !important;
}
.p-menuitem-link {
    background: rgba(10, 10, 10, 1);
    padding: 10px !important;
    &:hover {
        background: rgb(223, 223, 223);
        color: #111;
        text-shadow: none;
    }
}
.p-menuitem-link {
    display: flex;
    gap: 5px;
    font-size: 16px;
}
</style>
