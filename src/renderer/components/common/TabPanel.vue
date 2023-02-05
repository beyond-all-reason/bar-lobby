<template>
    <slot></slot>
</template>

<script lang="ts">
export default {
    name: "TabPanel",
    inheritAttrs: false,
    props: {
        header: null,
        disabled: Boolean,
    },
};
</script>
