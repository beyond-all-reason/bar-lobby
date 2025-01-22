<route lang="json5">
{ meta: { title: "Casual", order: 1, devOnly: true, onlineOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Matchmaking queue toggles for 1v1, 2v2, 3v3, 4v4, 5v5, 6v6, 7v7, 8v8, Small FFA (3 - 5), Medium FFA (6 - 10), Large FFA (11 - 16), TeamFFA
- Big shiny queue button, changes to cancel queue when queued already
- Ready modal popup when match is found, shows status like 9/10 players ready
- Should use TS and be hidden from everybody, even from yourself
- Lower minimum balance deviation criteria (25%?), for faster queue times and because it's less important in casual
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
