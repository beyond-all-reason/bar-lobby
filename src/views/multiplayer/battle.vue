<route>{ "meta": { "title": "Battle" } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Battle />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>