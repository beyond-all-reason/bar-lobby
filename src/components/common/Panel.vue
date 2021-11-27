<template>
    <component class="panel" :class="{ tabbed: Boolean(tabs.length) }" :is="is">
        <div class="content" :style="`--gap: ${gap}`">
            <div class="tabs" v-if="tabs.length">
                <Button v-for="(tab, i) in tabs" :key="i" :class="{ active: i === activeTab }" @click="activeTab = i">{{ tab.props?.title }}</Button>
            </div>
            <slot v-if="tabs.length === 0" />
            <component v-else v-for="(tab, i) in tabs" :key="i" :is="tab" v-show="i === activeTab" />
        </div>
    </component>

</template>

<script lang="ts">
import { defineComponent, reactive, ref, toRefs, VNode } from "vue";

export default defineComponent({
    props: {
        is: {
            type: String,
            default: "div"
        },
        gap: {
            type: String,
            default: "10px"
        }
    },
    setup(props, context) {
        const { is, gap } = toRefs(props);
        let tabs = reactive([] as VNode[]);
        const activeTab = ref(0);

        const slots = context.slots?.default?.();
        if (slots && slots.every(slot => (slot.type as any).name === "Tab")) {
            tabs = slots;
        }

        return { is, gap, tabs, activeTab };
    }
});
</script>

<style scoped lang="scss">
.panel {
    position: relative;
    max-height: 100%;
    //overflow-y: auto;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
}
.content {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    flex-grow: 1;
    overflow-y: auto;
}
</style>