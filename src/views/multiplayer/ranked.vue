<route lang="json">
{ "meta": { "title": "Ranked", "order": 0, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <Markdown
            source="
- Matchmaking queue toggles for 1v1, 2v2, 3v3, 4v4, 5v5, 6v6, 7v7, 8v8, Small FFA (3 - 5), Medium FFA (6 - 10), Large FFA (11 - 16), TeamFFA
- Show current rank for each playlist
- Big shiny queue button, changes to cancel queue when queued already
- Ready modal popup when match is found, shows status like 9/10 players ready

Ranked differences:

- New ranking system that makes more sense for ranked games, publicly visible
- No spectators
- Can't resign individually but can 'abandon' which incurs a penalty
- Team surrender only possible after x time and requires team approval (80%?)
- Player being AFK for more than x minutes counts as abandon
- Players who abandon are punished in some way, lower reputation, banned from matchmaking for x time or something
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
