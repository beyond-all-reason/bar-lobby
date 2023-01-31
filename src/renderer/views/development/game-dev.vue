<route lang="json5">
{ meta: { title: "Game", order: 0, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
    - Models and Animation
    - Lua, Widgets, Gadgets
    - Music and Sounds
    - Unit Definitions
    "
        />
    </div>
</template>

<script lang="ts" setup>
import Markdown from "vue3-markdown-it";

const route = api.router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
