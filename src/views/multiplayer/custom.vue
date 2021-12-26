<route>{ "meta": { "title": "Custom", "order": 2 } }</route>

<template>
    <div>
        <h1>{{ route.meta.title }}</h1>
        <markdown source="
- Classic server browser, maybe grid or list view options
- Preview pane to show players in the battle and additional info
- Host custom battle button (should request spawning a dedicated instance instead of being self-hosted)
- Host battle modal that includes options such as public/passworded/friends-only/invite-only, title, map, mode etc
- Uses TS but hidden, same as casual matchmaking
" />
        <Battle/>
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>