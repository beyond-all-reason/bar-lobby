<route>{ "meta": { "title": "Game", "order": 0 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown source="
- Models and Animation
- Lua, Widgets, Gadgets
- Music and Sounds
- Unit Definitions
" />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import Markdown from "vue3-markdown-it";

const route = useRoute();
</script>