<route>{ "meta": { "title": "Changes", "order": 2 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Should manual updates (blog-like posts) be in news section or here?
- Balance changes
- Github changes from all BAR repos?
" />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>