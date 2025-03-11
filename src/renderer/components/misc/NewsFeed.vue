// a news feed component that displays the latest news from this rss feed https://www.beyondallreason.info/microblogs/rss.xml
<template>
    <div class="fullheight fullwidth flex-col">
        <div class="news">
            <NewsTile :news="item" v-for="item in entries" v-bind:key="item.id" class="news-tile" />
        </div>
    </div>
</template>
<script lang="ts" setup>
import NewsTile from "@renderer/components/misc/NewsTile.vue";
const { entries } = await window.misc.getNewsRssFeed(3);
</script>

<style lang="scss" scoped>
.news {
    height: 100%;
    width: 100%;
    display: grid;
    grid-gap: 15px;
}
</style>
