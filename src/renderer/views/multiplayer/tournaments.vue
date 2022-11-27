<route lang="json">
{ "meta": { "title": "Tournaments", "order": 3, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Automated tournaments list (like in rocket league)
- Official tournaments list
- Unofficial tournaments list
- Host unofficial tournament button + modal (ability to even automate prize pools would be awesome)
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
