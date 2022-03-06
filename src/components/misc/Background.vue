<template>
    <div class="fullsize background">
        <div class="fullsize background__overlay" :class="{ active: blur }" />
    </div>
</template>

<script lang="ts" setup>

const props = defineProps<{
    blur?: boolean
}>();
</script>