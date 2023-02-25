<template>
    <ContextMenu ref="contextMenu" v-bind="$attrs" />
</template>

<script lang="ts" setup>
// https://primefaces.org/primevue/contextmenu

import ContextMenu, { ContextMenuEmits, ContextMenuProps } from "primevue/contextmenu";
import { ref } from "vue";

// eslint-disable-next-line
export interface Props extends ContextMenuProps {}

// eslint-disable-next-line
export interface Emits extends ContextMenuEmits {}

const props = defineProps<Props>();

const emits = defineEmits<Emits>();

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

function hide(event: Event): void {
    contextMenu.value!.hide();
}

function show(event: Event): void {
    contextMenu.value!.show(event);
}

function toggle(event: Event): void {
    contextMenu.value!.toggle(event);
}
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
