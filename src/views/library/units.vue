<route>{ "meta": { "title": "Units", "order": 1 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Similar to online unit browser, but automated
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