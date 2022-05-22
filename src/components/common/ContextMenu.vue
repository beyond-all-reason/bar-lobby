<template>
    <Popper v-click-away="() => (show = false)" v-bind="$attrs" openDelay="0" closeDelay="0" offsetDistance="0" :show="show" placement="right-start" class="context-menu" @click.right="show = true">
        <slot />
        <template #content>
            <div v-for="entry in props.entries" :key="entry.label" class="context-menu__entry">
                <div
                    class="context-menu__label"
                    @click="
                        () => {
                            entry.action(...args);
                            show = false;
                        }
                    "
                >
                    {{ entry.label }}
                </div>
            </div>
        </template>
    </Popper>
</template>

<script lang="ts" setup>
// https://valgeirb.github.io/vue3-popper/guide/api.html#props
// https://github.com/valgeirb/vue3-popper/blob/main/src/component/Popper.vue#L60

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ref } from "vue";
import Popper from "vue3-popper";

export interface ContextMenuEntry {
    label: string;
    action: (...args: any[]) => void;
    icon?: string;
    children?: ContextMenuEntry[];
}

const props = withDefaults(
    defineProps<{
        entries: ContextMenuEntry[];
        args: any[];
    }>(),
    {
        entries: () => [],
        args: () => [],
    }
);

const show = ref(false);
</script>

<style lang="scss" scoped>
.context-menu {
    :deep(.popper) {
        padding: 0 !important;
    }
    &__entry {
    }
    &__label {
        padding: 10px;
        &:hover {
            background-color: #ddd;
            color: #000;
            text-shadow: none;
        }
    }
}
</style>
