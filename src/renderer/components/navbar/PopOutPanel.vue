<template>
    <Panel class="popout-panel" :class="{ hidden: !open }" no-padding>
        <slot></slot>
    </Panel>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";

defineProps<{
    open: boolean;
}>();
</script>

<style lang="scss" scoped>
.popout-panel {
    position: fixed;
    right: 0;
    top: 70px;
    z-index: 2;
    min-width: 475px;
    max-width: 475px;
    min-height: 400px;
    max-height: 400px;
    background: rgba(0, 0, 0, 0.95);
    font-family: Poppins;
    :deep(.content) {
        padding: 0;
    }
    :deep(.p-tabview-panel) {
        padding: 15px;
    }
}
</style>
