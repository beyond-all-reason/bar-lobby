<template>
    <!-- eslint-disable -->
    <svg viewBox="0 0 24 24" :width="size" :height="size" v-html="svg"></svg>
</template>

<script lang="ts" setup>
/**
 * @todo Refactor this component to use the @iconify/vue component
 * https://docs.iconify.design/icon-components/vue/
 */

import { computed } from "vue";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { icons } = require("@iconify/json/json/mdi.json");

const props = defineProps({
    icon: {
        type: String,
        default: "home",
    },
    size: {
        type: Number,
        default: 23,
    },
});

const svg = computed(() => icons[props.icon].body);

if (svg.value === undefined) {
    throw new Error(`Icon ${props.icon} not found`);
}
</script>

<style lang="scss" scoped>
svg {
    vertical-align: top;
}
</style>
