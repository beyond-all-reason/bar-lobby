<template>
    <div class="fullsize">
        <div class="fullsize background"></div>
        <div class="fullsize background__overlay" :class="{ active: blur }"></div>
    </div>
</template>

<script lang="ts" setup>

const props = defineProps<{
    blur?: boolean
}>();
</script>