<template>
    <component :class="{ panel: Boolean(!empty), tabbed: Boolean(tabs.length) }" :is="is">
        <slot name="header" />
        <div class="tabs" v-if="tabs.length">
            <Button v-for="(tab, i) in tabs" :key="i" :class="{ active: i === activeTab }" @click="$emit('update:activeTab', i)">{{ tab.props?.title }}</Button>
        </div>
        <div class="content" :style="`--gap: ${gap}; --padding: ${padding}`">
            <slot v-if="tabs.length === 0" />
            <template v-else>
                <component v-for="(tab, i) in tabs" :key="i" :is="tab" v-show="i === activeTab" />
            </template>
        </div>
    </component>

</template>

<script lang="ts" setup>
import { reactive, toRefs, useSlots, VNode } from "vue";

const props = defineProps({
    is: {
        type: String,
        default: "div"
    },
    gap: {
        type: String,
        default: "10px"
    },
    padding: {
        type: String,
        default: "30px"
    },
    title: {
        type: String,
        default: ""
    },
    activeTab: {
        type: Number,
        default: 0
    },
    empty: Boolean
});

const emit = defineEmits(["update:activeTab"]);

const { is, gap, title } = toRefs(props);

let tabs = reactive([] as VNode[]);

const allSlots = useSlots();

const slots = allSlots?.default?.();
if (slots && slots.every(slot => (slot.type as any).name === "Tab")) {
    tabs = slots;
}
</script>

