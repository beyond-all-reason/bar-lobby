<template>
    <div>
        <div class="dev-title">
            {{ title }}
        </div>
        <div class="dev-date">
            {{ formatDistanceToNow(entry.published, { addSuffix: true }) }}
        </div>
        <div class="dev-desc">{{ description }}</div>
    </div>
</template>
<script lang="ts" setup>
import { NewsFeedData } from "@main/services/news.service";
import { formatDistanceToNow } from "date-fns";

const { entry } = defineProps<{ entry: NewsFeedData }>();

const title = entry.title.replace(" ⇀ Microblog ★ Beyond All Reason RTS", "");
// const tags = entry.description.split("|")[0]?.trim();
const description = entry.description.split("|")[1]?.trim();
</script>
<style lang="css" scoped>
.dev-title {
    font-size: 1.2em;
    font-weight: semibold;
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
}

.dev-date {
    font-size: 0.8em;
    margin-bottom: 5px;
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    color: rgba(255, 255, 255, 0.6);
}

.dev-desc {
    font-size: 1em;
    margin-bottom: 15px;
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    color: rgba(255, 255, 255, 0.8);
}
</style>
