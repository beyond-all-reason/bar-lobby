<template>
    <svg v-html="svg" viewBox="0 0 24 24" :width="size" :height="size" />
</template>

<script lang="ts">
import { defineComponent, toRefs } from "vue";

const { icons } = require("@iconify/json/json/mdi.json");

export default defineComponent({
    props: {
        icon: {
            type: String,
            default: "home"
        },
        size: {
            type: Number,
            default: 24
        }
    },
    setup(props) {
        const { icon, size } = toRefs(props);
        const svg = icons[icon.value];

        if (svg === undefined) {
            throw new Error(`Icon ${props.icon} not found`);
        }
        
        return {
            svg: svg.body,
            size
        };
    }
});
</script>

<style scoped lang="scss">
svg {
    vertical-align: top;
}
</style>