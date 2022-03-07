<template>
    <component :is="is" class="panel" :class="{ hidden: Boolean(hidden), tabbed: Boolean(tabs.length), paginatedTabs }">
        <slot name="header" />
        <div v-if="tabs.length" class="panel__tabs">
            <template v-if="paginatedTabs">
                <Button class="panel__tab-btn panel__prev-tab">
                    Prev
                </Button>
                <Button class="panel__tab-btn">
                    {{ activeTab.props.title }}
                </Button>
                <Button class="panel__tab-btn panel__next-tab">
                    Next
                </Button>
            </template>
            <template v-else>
                <Button v-for="(tab, i) in tabs" :key="i" :class="{ active: i === currentTab }" class="panel__tab-btn" @click="tabClicked(i)">
                    {{ tab.props?.title }}
                </Button>
            </template>
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
import { computed, ref, toRefs, VNode, watch } from "vue";
import { reactive, useSlots } from "vue";
import Button from "@/components/inputs/Button.vue";

const props = withDefaults(defineProps<{
    is?: string;
    width?: string;
    height?: string;
    padding?: string;
    activeTabIndex?: number;
    hidden?: boolean;
    paginatedTabs?: boolean;
}>(), {
    is: "div",
    width: "initial",
    height: "initial",
    padding: "30px",
    activeTabIndex: 0,
    hidden: false,
    paginatedTabs: false
});

const activeTabIndex = toRefs(props).activeTabIndex;

watch(activeTabIndex, (index) => {
    currentTab.value = index;
});

const currentTab = ref(0);

const emit = defineEmits(["update:activeTab"]);

const tabClicked = (tabIndex: number) => {
    currentTab.value = tabIndex;
    emit("update:activeTab", currentTab.value);
};

let tabs = reactive([] as VNode[]);

const activeTab = computed(() => tabs[activeTabIndex.value]);

const allSlots = useSlots();

const slots = allSlots?.default?.();
if (slots && slots.every(slot => (slot.type as any).name === "Tab")) {
    tabs = slots;
}
</script>

