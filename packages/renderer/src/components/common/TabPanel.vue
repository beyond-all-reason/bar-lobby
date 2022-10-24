<template>
    <slot></slot>
</template>

<script>
export default {
    name: "TabPanel",
    inheritAttrs: false,
    props: {
        header: null,
        disabled: Boolean,
    },
};
</script>
