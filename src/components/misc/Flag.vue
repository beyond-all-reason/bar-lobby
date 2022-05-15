<template>
    <div v-if="countryCode" :class="`flag fi fi-${countryCode.toLowerCase()}`" />
</template>

<script lang="ts" setup>
const props = defineProps<{
    countryCode: string;
}>();
</script>