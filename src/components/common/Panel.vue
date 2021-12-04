<template>
    <component class="panel" :class="{ tabbed: Boolean(tabs.length) }" :is="is">
        <slot name="header" />
        <div class="tabs" v-if="tabs.length">
            <Button v-for="(tab, i) in tabs" :key="i" :class="{ active: i === activeTab }" @click="$emit('update:activeTab', i)">{{ tab.props?.title }}</Button>
        </div>
        <div class="content" :style="`--gap: ${gap}`">
            <slot v-if="tabs.length === 0" />
            <component v-else v-for="(tab, i) in tabs" :key="i" :is="tab" v-show="i === activeTab" />
        </div>
    </component>

</template>

<script lang="ts">
import { defineComponent, reactive, toRefs, VNode } from "vue";

export default defineComponent({
    props: {
        is: {
            type: String,
            default: "div"
        },
        gap: {
            type: String,
            default: "10px"
        },
        title: {
            type: String,
            default: ""
        },
        activeTab: {
            type: Number,
            default: 0
        }
    },
    emits: ["update:activeTab"],
    setup(props, context) {
        const { is, gap, title } = toRefs(props);

        let tabs = reactive([] as VNode[]);

        const slots = context.slots?.default?.();
        if (slots && slots.every(slot => (slot.type as any).name === "Tab")) {
            tabs = slots;
        }

        return { title, is, gap, tabs };
    }
});
</script>

