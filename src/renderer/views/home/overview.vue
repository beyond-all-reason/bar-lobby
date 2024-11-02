<route lang="json5">
{ meta: { title: "Overview", order: 0, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="two-columns">
            <div>
                <Panel>
                    <div>
                        <h1>Beyond All Reason</h1>
                        <p>
                            Welcome to the new lobby! Be aware this project is a work-in-progress and it is still recommended you use the
                            standard lobby client for now.
                        </p>
                    </div>
                </Panel>
            </div>
            <NewsFeed />
        </div>
    </div>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
import NewsFeed from "@renderer/components/misc/NewsFeed.vue";

/**
 * - Small panes that preview content that can be displayed in more detail when clicking through to their full pages
 * - Lates news (manual blog-like posts)
 * - Latest updates (automated balance changes, simple github feed)
 * - Upcoming tournaments
 * - Some simple stats (e.g. players online, players ingame)
 * - Social links
 * - Promo space (recent video, cosmetic content or something?)
 */
</script>

<style lang="scss" scoped>
.two-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    flex: 1;
}
</style>
