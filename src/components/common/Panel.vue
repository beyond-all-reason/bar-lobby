<template>
    <component :is="is" class="panel" :class="{ hidden, tabbed: Boolean(tabs.length), paginatedTabs, light, scrollContent }">
        <div v-if="slots.header || tabs.length" class="panel__header" :class="{ panel__tabs: Boolean(tabs.length) }">
            <template v-if="tabs.length">
                <template v-if="paginatedTabs">
                    <Button class="panel__prev-tab" @click="prevTab">
                        <Icon icon="chevron-left" />
                    </Button>
                    <Button class="panel__single-tab" :tooltip="activeTab.props?.tooltip">
                        {{ activeTab.props?.title }}
                    </Button>
                    <Button class="panel__next-tab" @click="nextTab">
                        <Icon icon="chevron-right" />
                    </Button>
                </template>
                <template v-else>
                    <Button v-for="(tab, i) in tabs" :key="i" :class="{ active: i === currentTab }" class="panel__tab-btn" :tooltip="tab.props?.tooltip" @click="tabClicked(i)">
                        {{ tab.props?.title }}
                    </Button>
                </template>
            </template>

            <slot v-else name="header" />
        </div>

        <div class="panel__content" :style="`--padding: ${padding}; --width: ${width}; --height: ${height}`">
            <slot v-if="tabs.length === 0" />
            <template v-for="(tab, i) in tabs" v-else :key="i">
                <component :is="tab" v-if="i === currentTab" />
            </template>
        </div>
    </component>
</template>

<script lang="ts" setup>
import { computed, ref, toRefs, VNode, watch } from "vue";
import { useSlots } from "vue";

import Icon from "@/components/common/Icon.vue";
import Button from "@/components/inputs/Button.vue";

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

const tabs = computed(() => {
    slots = useSlots();

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
    &.hidden {
        opacity: 0;
        transform: translateY(-20px);
    }
    &__content {
        position: relative;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        width: var(--width);
        height: var(--height);
        padding: var(--padding);
        overflow-y: auto;
    }
    &.scrollContent .panel__content {
        flex-basis: 0;
        overflow-y: scroll;
    }
    &__header {
        justify-content: space-between;
        width: 100%;
        box-shadow: 0px 2px 2px 0px rgba(0, 0, 0, 0.3);
        z-index: 1;
    }
    :deep(.panel__header.panel__tabs) {
        z-index: 0;
    }
    &__tabs,
    &__header {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: row;
        background-color: rgba(59, 59, 59, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        :deep(.control.button) {
            align-self: unset;
        }
        :deep(.btn) {
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
    &__tabs {
        display: flex;
        flex-wrap: wrap;
        & > * {
            display: flex;
            flex-grow: 1;
        }
        :deep(.btn) {
            padding: 0 20px;
        }
    }
    &.paginatedTabs {
        .panel__single-tab {
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
        .panel__tabs {
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
    background-image: url("~@/assets/images/squares.png");
    background-size: auto;
    opacity: 0.3;
    mix-blend-mode: overlay;
    z-index: -1;
}

.view > .panel {
    transition: transform 0.3s, opacity 0.3s;
}
</style>
