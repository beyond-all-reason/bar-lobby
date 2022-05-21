<template>
    <Popper
        v-if="content"
        v-bind="$attrs"
        hover
        openDelay="400"
        closeDelay="0"
        offsetDistance="5"
        :interactive="false"
        :content="content"
        class="tooltip"
    >
        <slot />
        <template #content="contentProps">
            <slot name="content" v-bind="contentProps" />
        </template>
    </Popper>
    <slot v-else v-bind="$attrs" />
</template>

<script lang="ts" setup>
import Popper from "vue3-popper";

const props = defineProps<{
    content?: string;
}>();
</script>

<style lang="scss" scoped>
.tooltip :deep(.popper) {
    pointer-events: none;
}
</style>