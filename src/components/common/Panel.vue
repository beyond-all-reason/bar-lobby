<template>
    <component :is="is" class="panel" :class="{ hidden: Boolean(hidden), tabbed: Boolean(tabs.length) }">
        <slot name="header" />
        <div v-if="tabs.length" class="panel__tabs">
            <Button v-for="(tab, i) in tabs" :key="i" :class="{ active: i === currentTab }" @click="tabClicked(i)">
                {{ tab.props?.title }}
            </Button>
        </div>
        <div class="panel__content" :style="`--padding: ${padding}; --width: ${width}; --height: ${height}`">
            <slot v-if="tabs.length === 0" />
            <template v-else>
                <component :is="tab" v-for="(tab, i) in tabs" v-show="i === currentTab" :key="i" />
            </template>
        </div>
    </component>
</template>

<script lang="ts" setup>
import { ref, toRefs, VNode, watch } from "vue";
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

const activeTab = toRefs(props).activeTab;

watch(activeTab, (index) => {
    currentTab.value = index;
});

const currentTab = ref(0);

const emit = defineEmits(["update:activeTab"]);

const tabClicked = (tabIndex: number) => {
    currentTab.value = tabIndex;
    emit("update:activeTab", currentTab.value);
};

let tabs = reactive([] as VNode[]);

const allSlots = useSlots();

const slots = allSlots?.default?.();
if (slots && slots.every(slot => (slot.type as any).name === "Tab")) {
    tabs = slots;
}
</script>

