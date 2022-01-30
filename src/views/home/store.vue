<route>{ "meta": { "title": "Store", "order": 4 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown source="
- Unit skins
- HUD themes
- Custom Emojis 🙃
- Particle/projectile effects?
" />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import Markdown from "vue3-markdown-it";

const route = useRoute();
</script>