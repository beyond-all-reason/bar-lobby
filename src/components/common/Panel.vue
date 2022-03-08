<template>
    <component :is="is" class="panel" :class="{ hidden, tabbed: Boolean(tabs.length), paginatedTabs, light, scrollContent }">
        <slot name="header" />
        <div v-if="tabs.length" class="panel__tabs">
            <template v-if="paginatedTabs">
                <Button class="panel__prev-tab" @click="prevTab">
                    <Icon icon="chevron-left" />
                </Button>
                <Button class="panel__single-tab">
                    {{ activeTab.props?.title }}
                </Button>
                <Button class="panel__next-tab" @click="nextTab">
                    <Icon icon="chevron-right" />
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
import { computed, ref, toRefs, watch } from "vue";
import { useSlots } from "vue";
import Button from "@/components/inputs/Button.vue";
import Icon from "@/components/common/Icon.vue";

const props = withDefaults(defineProps<{
    is?: string;
    width?: string;
    height?: string;
    padding?: string;
    activeTabIndex?: number;
    hidden?: boolean;
    paginatedTabs?: boolean;
    light?: boolean;
    scrollContent?: boolean;
}>(), {
    is: "div",
    width: "initial",
    height: "initial",
    padding: "30px",
    activeTabIndex: 0,
    hidden: false,
    paginatedTabs: false,
    light: false,
    scrollContent: false
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

const tabs = computed(() => {
    const slots = useSlots();

    if (slots.default) {
        return slots.default().filter(slot => typeof slot.type === "object" && "name" in slot.type && slot.type.name === "Tab");
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

