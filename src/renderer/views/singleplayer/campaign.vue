<route lang="json5">
{ meta: { title: "Campaign", order: 0, devOnly: true, transition: { name: "slide-left" } } }
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
import Markdown from "vue3-markdown-it";

const route = api.router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
