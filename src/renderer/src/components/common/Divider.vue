<template>
    <Divider v-bind="$props" />
</template>

<script lang="ts" setup>
import Divider, { DividerProps } from "primevue/divider";

// eslint-disable-next-line
interface Props extends DividerProps {}

const props = defineProps<Props>();
</script>

<style lang="scss" scoped>
.p-divider {
    &:before {
        border-left-width: 1px;
        border-left-color: rgba(255, 255, 255, 0.1);
    }
}
</style>
