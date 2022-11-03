<template>
    <slot />
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    name: "Tab",
});
</script>

<script lang="ts" setup>
const props = defineProps<{
    title: string;
    tooltip?: string;
}>();
</script>

<style lang="scss" scoped></style>
