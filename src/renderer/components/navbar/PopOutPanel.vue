<template>
    <Panel class="popout-panel" :class="{ hidden: !open }">
        <slot></slot>
    </Panel>
</template>

<script lang="ts" setup>
import Panel from "@/components/common/Panel.vue";

const props = defineProps<{
    open: boolean;
}>();
</script>

<style lang="scss" scoped>
/**
* TODO: make this use <Transition> with v-show
*/

.popout-panel {
    position: fixed;
    right: 0;
    top: 70px;
    z-index: 2;
    min-width: 475px;
    max-width: 475px;
    min-height: 400px;
    max-height: 400px;
    //transform: translateX(-9px);
    //opacity: 1;
    //transition: transform 200ms, opacity 200ms;
    background: rgba(0, 0, 0, 0.85);
    :deep(.content) {
        padding: 0;
    }
    :deep(.p-tabview-panel) {
        padding: 15px;
    }
    // &.hidden {
    //     transform: translateX(20px);
    //     opacity: 0;
    //     pointer-events: none;
    // }
}
</style>
