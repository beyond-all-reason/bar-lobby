<route lang="json5">
{ meta: { title: "Donate", order: 3, transition: { name: "slide-left" } } }
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
import Markdown from "vue3-markdown-it";

const route = api.router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
