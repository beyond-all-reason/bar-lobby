<template>
    <svg v-html="svg" viewBox="0 0 24 24" :width="size" :height="size"></svg>
</template>

<script lang="ts" setup>
import { toRefs } from "vue";

/**
 * @todo Refactor this component to use the @iconify/vue component
 * https://docs.iconify.design/icon-components/vue/
 */

const { icons } = require("@iconify/json/json/mdi.json");

const props = defineProps({
    icon: {
        type: String,
        default: "home"
    },
    size: {
        type: Number,
        default: 24
    }
});


const { icon, size } = toRefs(props);
const svg = icons[icon.value].body;

if (svg === undefined) {
    throw new Error(`Icon ${props.icon} not found`);
}
</script>

<style scoped lang="scss">
svg {
    vertical-align: top;
}
</style>