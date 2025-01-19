<template>
    <div class="fullsize background">
        <div class="fullsize background__overlay" :class="{ active: blur }" />
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    blur?: boolean;
}>();
</script>

<style lang="scss" scoped>
.background {
    @extend .fullsize;
    left: 0;
    top: 0;
    background: var(--background);
    background-size: cover;
    background-position: center;
    z-index: -1;
    transition: 1s ease-in-out;
    &__overlay {
        background-color: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(0px);
        z-index: -1;
        transition:
            background-color,
            backdrop-filter 0.4s ease-in-out;
        &.active {
            background-color: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(7px) saturate(90%);
        }
    }
}
</style>
