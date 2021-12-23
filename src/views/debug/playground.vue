<route>{ "meta": { "title": "Playground", "order": 1 } }</route>

<template>
    <div>
        <Range label="cool" :min="5" v-model="thing" />
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const thing = ref(5);
</script>

<style scoped lang="scss">
</style>