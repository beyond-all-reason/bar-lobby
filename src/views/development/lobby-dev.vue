<route>{ "meta": { "title": "Lobby", "order": 2 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown source="
- BAR lobby
- TypeScript
- Electron
- Vue
" />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import Markdown from "vue3-markdown-it";

const route = useRoute();
</script>