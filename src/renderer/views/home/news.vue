<route lang="json">
{ "meta": { "title": "News", "order": 1, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- List of news posts (tiled previews)
- Searchable
- Sortable
- Filterable
- Paginated
"
        />
    </div>
</template>

<script lang="ts" setup>
import Markdown from "vue3-markdown-it";

const route = api.router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
