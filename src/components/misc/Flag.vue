<template>
    <div v-if="countryCode" :class="`flag fi fi-${countryCode.toLowerCase()}`" />
</template>

<script lang="ts" setup>
const props = defineProps<{
    countryCode: string;
}>();
</script>

<style lang="scss" scoped>
$flag-icons-path: "~flag-icons/flags";
@import "~flag-icons/sass/flag-icons.scss";

.flag {
    max-width: 100%;
}
</style>
