<route lang="json">
{ "meta": { "title": "Donate", "order": 3, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- BAR is a free, open-source project supported by hardworking individuals blahblah
- How your donation gets used
- Donate button
- List of donators
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
