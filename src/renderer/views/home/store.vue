<route lang="json5">
{ meta: { title: "Store", order: 4, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Unit skins
- HUD themes
- Custom Emojis 🙃
- Particle/projectile effects?
"
        />
    </div>
</template>

<script lang="ts" setup>
import Markdown from "vue3-markdown-it";

const route = api.router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
