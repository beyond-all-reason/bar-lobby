<route lang="json">
{ "meta": { "title": "Campaign", "order": 0, "offline": true, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- New campaign
- Continue campaign
- Load save
- Mission select
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
