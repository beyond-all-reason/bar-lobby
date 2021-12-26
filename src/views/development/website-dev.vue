<route>{ "meta": { "title": "Website", "order": 4 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Main website, blog posts, guides
- bar-rts.com, replays, battles, leaderboards, maps, player profiles
" />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>