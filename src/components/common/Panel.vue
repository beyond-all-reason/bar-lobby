<template>
    <component :is="is" class="panel" :class="{ hidden: Boolean(hidden), tabbed: Boolean(tabs.length) }">
        <slot name="header" />
        <div v-if="tabs.length" class="panel__tabs">
            <Button v-for="(tab, i) in tabs" :key="i" :class="{ active: i === activeTab }" @click="emit('update:activeTab', i)">
                {{ tab.props?.title }}
            </Button>
        </div>
        <div class="panel__content" :style="`--padding: ${padding}; --width: ${width}; --height: ${height}`">
            <slot v-if="tabs.length === 0" />
            <template v-else>
                <component :is="tab" v-for="(tab, i) in tabs" v-show="i === activeTab" :key="i" />
            </template>
        </div>
    </component>
</template>

<script lang="ts" setup>
import type { VNode } from "vue";
import { reactive, useSlots } from "vue";
import Button from "@/components/inputs/Button.vue";

interface PanelProps {
    is?: string;
    width?: string;
    height?: string;
    padding?: string;
    activeTab?: number;
    hidden?: boolean;
}

const props = withDefaults(defineProps<PanelProps>(), {
    is: "div",
    width: "initial",
    height: "initial",
    padding: "30px",
    activeTab: 0
});

const emit = defineEmits(["update:activeTab"]);

let tabs = reactive([] as VNode[]);

const allSlots = useSlots();

const slots = allSlots?.default?.();
if (slots && slots.every(slot => (slot.type as any).name === "Tab")) {
    tabs = slots;
}
</script>

