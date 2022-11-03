<route lang="json">
{ "meta": { "title": "Maps", "order": 1, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- How maps work
- Common workflow
- What makes a map good
"
        />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import Markdown from "vue3-markdown-it";

const route = useRoute();
</script>

<style lang="scss" scoped></style>
