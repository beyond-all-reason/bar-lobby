<route lang="json5">
{ meta: { title: "Scenarios", order: 1, offline: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Scenarios list - pull from online scenarios database?
- Scenario preview panel - shows mission objective, top 10 leaderboard
"
        />
    </div>
</template>

<script lang="ts" setup>
import Markdown from "vue3-markdown-it";

const route = api.router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
