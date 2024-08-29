<template>
    <div>
        <div v-for="totalPlayers"></div>
    </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
    totalPlayers: number;
    totalReady: number;
}>();
</script>

<style lang="scss" scoped></style>
