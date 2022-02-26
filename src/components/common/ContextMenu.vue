<template>
    <Popper v-bind="$attrs" openDelay="0" closeDelay="0" offsetDistance="0" :show="show" placement="right-start" class="context-menu" @contextmenu="show = true" v-click-away="() => show = false">
        <slot></slot>
        <template #content>
            <div class="context-menu__entry" v-for="entry in props.entries" :key="entry.label">
                <div class="context-menu__label" @click="() => { entry.action(); show = false }">{{ entry.label }}</div>
            </div>
        </template>
    </Popper>
</template>

<script lang="ts" setup>
// https://valgeirb.github.io/vue3-popper/guide/api.html#props
// https://github.com/valgeirb/vue3-popper/blob/main/src/component/Popper.vue#L60

import { ref } from "vue";
import Popper from "vue3-popper";

interface ContextMenuEntry {
    label: string;
    action: () => void;
    icon?: string;
    children?: ContextMenuEntry[];
}

const props = defineProps<{
    entries: ContextMenuEntry[];
}>();

const show = ref(false);
</script>