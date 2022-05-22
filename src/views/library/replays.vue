<route lang="json">
{ "meta": { "title": "Replays", "order": 0, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Local replays
- Online replays
- Preview pane
- Searchable
- Sortable
- Filterable
- Paginated
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
