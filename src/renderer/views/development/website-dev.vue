<route lang="json">
{ "meta": { "title": "Website", "order": 4, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Main website, blog posts, guides
- bar-rts.com, replays, battles, leaderboards, maps, player profiles
"
        />
    </div>
</template>

<script lang="ts" setup>
import Markdown from "vue3-markdown-it";

const route = api.router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
