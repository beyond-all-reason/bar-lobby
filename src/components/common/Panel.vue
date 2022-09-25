<template>
    <component :is="is" class="panel" :class="{ empty, tabbed: Boolean(tabs.length), paginatedTabs, light, scrollContent }">
        <div v-if="slots.header || tabs.length" class="header" :class="{ tabs: Boolean(tabs.length) }">
            <template v-if="tabs.length">
                <template v-if="paginatedTabs">
                    <Button class="prev-tab" @click="prevTab">
                        <Icon :icon="chevronLeft" />
                    </Button>
                    <Button v-tooltip="activeTab.props?.tooltip" class="single-tab">
                        {{ activeTab.props?.title }}
                    </Button>
                    <Button class="next-tab" @click="nextTab">
                        <Icon :icon="chevronRight" />
                    </Button>
                </template>
                <template v-else>
                    <Button v-for="(tab, i) in tabs" :key="i" v-tooltip="tab.props?.tooltip" :class="{ active: i === currentTab }" @click="tabClicked(i)">
                        {{ tab.props?.title }}
                    </Button>
                </template>
            </template>

            <slot v-else name="header" />
        </div>

        <div class="content" :style="`--padding: ${padding}; --width: ${width}; --height: ${height}`">
            <slot v-if="tabs.length === 0" />
            <div v-for="(tab, i) in tabs" v-else :key="i" class="tab-content">
                <component :is="tab" v-if="i === currentTab" />
            </div>
        </div>
    </component>
</template>

<script lang="ts" setup>
/**
 * TODO: replace tabs with https://www.primefaces.org/primevue/tabview
 */

import { Icon } from "@iconify/vue";
import chevronLeft from "@iconify-icons/mdi/chevron-left";
import chevronRight from "@iconify-icons/mdi/chevron-right";
import { computed, ref, toRefs, useSlots, VNode, watch } from "vue";

import Button from "@/components/controls/Button.vue";

const props = withDefaults(
    defineProps<{
        is?: string;
        width?: string;
        height?: string;
        padding?: string;
        activeTabIndex?: number;
        hidden?: boolean;
        paginatedTabs?: boolean;
        light?: boolean;
        scrollContent?: boolean;
        empty?: boolean;
    }>(),
    {
        is: "div",
        width: "initial",
        height: "initial",
        padding: "30px",
        activeTabIndex: 0,
        hidden: false,
        paginatedTabs: false,
        light: false,
        scrollContent: false,
    }
);

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

let slots = useSlots();

const stuff = ref(0);

const tabs = computed(() => {
    slots = useSlots();

    stuff.value;

    if (slots.default) {
        let tabsParent = slots.default() as VNode[];

        if (typeof tabsParent[0].type !== "object") {
            tabsParent = tabsParent[0].children as VNode[];
        }

        if (tabsParent && Array.isArray(tabsParent)) {
            return tabsParent.filter((slot) => typeof slot.type === "object" && "name" in slot.type && slot.type.name === "Tab");
        }
    }

    return [];
});

defineExpose({
    updateTabs: () => {
        stuff.value++;
    },
});

const activeTab = computed(() => tabs.value[currentTab.value]);

const prevTab = () => {
    if (currentTab.value > 0) {
        currentTab.value--;
    } else {
        currentTab.value = tabs.value.length - 1;
    }
};

const nextTab = () => {
    if (currentTab.value < tabs.value.length - 1) {
        currentTab.value++;
    } else {
        currentTab.value = 0;
    }
};
</script>

<style lang="scss" scoped>
.panel {
    position: relative;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
    backdrop-filter: blur(10px) brightness(1) saturate(2);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    border-bottom: 1px solid rgba(124, 124, 124, 0.3);
    box-shadow: -1px 0 0 rgba(0, 0, 0, 0.3), 1px 0 0 rgba(0, 0, 0, 0.3), 0 1px 0 rgba(0, 0, 0, 0.3), 0 -1px 0 rgba(0, 0, 0, 0.3), inset 0 0 50px rgba(255, 255, 255, 0.15),
        inset 0 3px 8px rgba(255, 255, 255, 0.1), 3px 3px 10px rgba(0, 0, 0, 0.8);
    &.empty {
        background: transparent;
        backdrop-filter: none;
        border-color: transparent;
        box-shadow: none;
        &:after {
            background: none;
        }
    }
    .content {
        position: relative;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        width: var(--width);
        height: var(--height);
        padding: var(--padding);
        overflow-y: auto;
    }
    &.scrollContent .content {
        flex-basis: 0;
        overflow-y: scroll;
    }
    .header {
        justify-content: space-between;
        width: 100%;
        box-shadow: 0px 2px 2px 0px rgba(0, 0, 0, 0.3);
        z-index: 1;
    }
    :deep(.header.tabs) {
        z-index: 0;
    }
    .tabs,
    .header {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: row;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        :deep(.control.button) {
            align-self: unset;
        }
        :deep(.button) {
            background: transparent;
            border: none;
            box-shadow: none;
            &:hover,
            &.active {
                background: rgba(255, 255, 255, 0.1);
                box-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
            }
        }
    }
    .tabs {
        display: flex;
        flex-wrap: wrap;
        & > * {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-grow: 1;
        }
    }
    &.paginatedTabs {
        .single-tab {
            width: 100%;
            pointer-events: none;
        }
    }
    &.light {
        background: rgba(255, 255, 255, 0.05);
        box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-top: 1px solid rgba(255, 255, 255, 0.25);
        border-left: 1px solid rgba(255, 255, 255, 0.2);
        border-right: 1px solid rgba(255, 255, 255, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: none;
        .tabs {
            background: rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        &:after {
            background: none;
        }
    }
}

.panel:after,
.tabs:after {
    @extend .fullsize;
    left: 0;
    top: 0;
    background-image: url("~@/assets/images/squares.png");
    background-size: auto;
    opacity: 0.3;
    mix-blend-mode: overlay;
    z-index: -1;
}
</style>
