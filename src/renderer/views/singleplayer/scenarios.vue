<route lang="json">
{ "meta": { "title": "Scenarios", "order": 1, "offline": true, "transition": { "name": "slide-left" } } }
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
import { useRoute } from "vue-router";
import Markdown from "vue3-markdown-it";

const route = useRoute();
</script>

<style lang="scss" scoped></style>
