<route lang="json5">
{ meta: { title: "Tutorials", order: 3, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Custom type scenarios that slowly introduce the game in segmented chunks

Tutorials might include:

- Camera controls (Only show minimap)
- Commander + Commands (Now show build menu)
- Basic economy + Basic defense (Now show resource bars)
- Constructors + Factories + Buildpower
- Win condition
- Advanced economy
- Advanced units
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
