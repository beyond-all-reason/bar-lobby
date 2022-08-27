<template>
    <div v-if="countryCode && countryCode !== '??'" :class="`flag fi fi-${countryCode.toLowerCase()}`" />
</template>

<script lang="ts" setup>
const props = defineProps<{
    countryCode: string;
}>();
</script>

<style lang="scss" scoped>
.flag {
    max-width: 100%;
}
</style>
