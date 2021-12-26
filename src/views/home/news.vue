<route>{ "meta": { "title": "News", "order": 1 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- List of news posts (tiled previews)
- Searchable
- Sortable
- Filterable
- Paginated
" />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>