<route lang="json">
{ "meta": { "title": "Home", "order": 0, "transition": { "name": "slide-left" } } }
</route>

<template>
    <div>
        <h1>{{ $t("home") }}</h1>
        <Markdown
            source="
- Small panes that preview content that can be displayed in more detail when clicking through to their full pages
- Lates news (manual blog-like posts)
- Latest updates (automated balance changes, simple github feed)
- Upcoming tournaments
- Some simple stats (e.g. players online, players ingame)
- Social links
- Promo space (recent video, cosmetic content or something?)
"
        />
    </div>
</template>

<script lang="ts" setup>
import Markdown from "vue3-markdown-it";
</script>

<style lang="scss" scoped></style>
