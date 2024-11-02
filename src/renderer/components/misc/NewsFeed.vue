// a news feed component that displays the latest news from this rss feed https://www.beyondallreason.info/microblogs/rss.xml
<template>
    <Panel>
        <div class="fullheight fullwidth flex-col">
            <div class="scroll-container">
                <div class="featured">
                    <NewsTile featured :news="featured" class="news-tile" />
                </div>
                <div class="news">
                    <NewsTile :news="item" v-for="item in entries" v-bind:key="item.id" class="news-tile" />
                </div>
            </div>
        </div>
    </Panel>
</template>
<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
import NewsTile from "@renderer/components/misc/NewsTile.vue";
const { entries } = await window.misc.getNewsRssFeed();
const featured = entries.shift();
</script>

<style lang="scss" scoped>
.news {
    width: 100%;
    height: 50%;
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
    grid-auto-flow: dense;
    padding-right: 10px;
}

.featured {
    height: 50%;
    margin-bottom: 15px;
    padding-right: 10px;
}
</style>
