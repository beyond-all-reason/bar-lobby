<route>{ "meta": { "title": "Overview", "order": 0 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Player name
- Avatar - Steam or choose from BAR selection?
- Profile level (fancy banner associated with level?)
- Ranks in each playlist
- Simple stats - games played, favourite faction, favourite mode
- Recent achievements unlocked
- Recent activity/matches
" />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>