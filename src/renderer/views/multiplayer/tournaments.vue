<route lang="json5">
{ meta: { title: "Tournaments", order: 3, devOnly: true, onlineOnly: true, transition: { name: "slide-left" } } }
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
import { useRouter } from "vue-router";
import Markdown from "@renderer/components/misc/Markdown.vue";

const router = useRouter();
const route = router.currentRoute.value;
</script>

<style lang="scss" scoped></style>
