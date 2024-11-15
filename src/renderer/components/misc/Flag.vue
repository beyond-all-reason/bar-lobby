<template>
    <div class="flex-col flex-center">
        <div v-if="countryCode && countryCode !== '??'" :class="`flag fi fi-${countryCode.toLowerCase()}`" />
        <img v-else class="flag fi" src="/assets/images/icons/flag-earth.png" />
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    countryCode?: string;
}>();
</script>

<style lang="scss" scoped>
.flag {
    max-width: 100%;
}
</style>
