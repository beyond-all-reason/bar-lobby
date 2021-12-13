<route>{ "meta": { "title": "Home" } }</route>

<template>
    <Panel>
        <h1>Home</h1>
        <markdown source="
- Small panes that preview content that can be displayed in more detail when clicking through to their full pages
- Lates news (manual blog-like posts)
- Latest updates (automated balance changes, simple github feed)
- Upcoming tournaments
- Some simple stats (e.g. players online, players ingame)
- Social links
- Promo space (recent video, cosmetic content or something?)
" />
    </Panel>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    setup() {
        return {};
    }
});
</script>

