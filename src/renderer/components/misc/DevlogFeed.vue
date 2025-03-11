// a news feed component that displays the latest news from this rss feed https://www.beyondallreason.info/microblogs/rss.xml
<template>
    <div class="fullheight fullwidth flex-col">
        <div class="devlog-title">Latest changes</div>
        <div class="devlog-entries scroll-container">
            <DevlogEntry v-for="entry in entries" :entry="entry" :key="entry.id" />
        </div>
    </div>
</template>
<script lang="ts" setup>
import DevlogEntry from "@renderer/components/misc/DevlogEntry.vue";

const { entries } = await window.misc.getDevlogRssFeed(3);
</script>

<style lang="scss" scoped>
.devlog-title {
    margin-top: 30px;
    margin-bottom: 15px;
    align-self: center;
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    text-transform: uppercase;
}

.devlog-entries {
    background-color: black;
    background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 70%);
}
</style>
