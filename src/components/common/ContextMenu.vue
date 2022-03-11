<template>
    <Popper v-click-away="() => show = false" v-bind="$attrs" open-delay="0" close-delay="0" offset-distance="0" :show="show" placement="right-start" class="context-menu" @click.right="show = true">
        <slot />
        <template #content>
            <div v-for="entry in props.entries" :key="entry.label" class="context-menu__entry">
                <div class="context-menu__label" @click="() => { entry.action(); show = false }">
                    {{ entry.label }}
                </div>
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