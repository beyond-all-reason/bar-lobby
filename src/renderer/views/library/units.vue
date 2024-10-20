<route lang="json5">
{ meta: { title: "Units", order: 1, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Similar to online unit browser, but automated
- Searchable
- Sortable
- Filterable
- Paginated
"
        />
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import Markdown from "@renderer/components/misc/Markdown.vue";

const router = useRouter();
const route = router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
