<route>{ "meta": { "title": "Replays", "order": 0 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Local replays
- Online replays
- Preview pane
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