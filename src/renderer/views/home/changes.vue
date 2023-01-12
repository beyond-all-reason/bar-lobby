<route lang="json">
{ "meta": { "title": "Changes", "order": 2, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Should manual updates (blog-like posts) be in news section or here?
- Balance changes
- Github changes from all BAR repos?
"
        />
    </div>
</template>

<script lang="ts" setup>
import Markdown from "vue3-markdown-it";

const route = api.router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
