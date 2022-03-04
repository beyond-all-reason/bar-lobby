<template>
    <component class="panel" :class="{ hidden: Boolean(hidden), tabbed: Boolean(tabs.length) }" :is="is">
        <slot name="header" />
        <div class="panel__tabs" v-if="tabs.length">
            <Button v-for="(tab, i) in tabs" :key="i" :class="{ active: i === activeTab }" @click="emit('update:activeTab', i)">{{ tab.props?.title }}</Button>
        </div>
        <div class="panel__content" :style="`--padding: ${padding}; --width: ${width}; --height: ${height}`">
            <slot v-if="tabs.length === 0" />
            <template v-else>
                <component v-for="(tab, i) in tabs" :key="i" :is="tab" v-show="i === activeTab" />
            </template>
        </div>
    </component>

</template>

<script lang="ts" setup>
import { reactive, useSlots, VNode } from "vue";
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

