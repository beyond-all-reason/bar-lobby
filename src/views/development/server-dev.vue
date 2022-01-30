<route>{ "meta": { "title": "Server", "order": 3 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown source="
- Teiserver
- Tachyon protocol
" />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import Markdown from "vue3-markdown-it";

const route = useRoute();
</script>