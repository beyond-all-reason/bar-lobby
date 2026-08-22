<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <component
        :is="entry?.link ? 'button' : 'div'"
        class="dev-entry"
        :class="{ clickable: !!entry?.link }"
        :type="entry?.link ? 'button' : undefined"
        @click="openEntry"
    >
        <div class="dev-title">
            {{ title }}
        </div>
        <div v-if="entry?.published" class="dev-date">
            {{ formatDistanceToNow(entry.published, { addSuffix: true }) }}
        </div>
        <div class="dev-desc">{{ description }}</div>
        <div v-if="entry?.link" class="dev-more">{{ t("lobby.components.misc.devlogEntry.readMore") }}</div>
    </component>
</template>
<script lang="ts" setup>
import { NewsFeedData } from "@main/services/news.service";
import { formatDistanceToNow } from "date-fns";
import { computed } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import { shellApi } from "@renderer/api/shell";

const { t } = useTypedI18n();

const { entry } = defineProps<{ entry: NewsFeedData | undefined }>();

const title = computed(() => entry?.title?.replace(" ⇀ Microblog ★ Beyond All Reason RTS", ""));
const description = computed(() => entry?.description?.split("|")[1]?.trim());

const openEntry = () => {
    if (entry?.link) shellApi.openInBrowser(entry.link);
};
</script>
<style lang="css" scoped>
.dev-entry {
    display: block;
    width: 100%;
    text-align: left;
    margin-bottom: 15px;
    padding: 10px;
    border: none;
    border-left: 2px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.35);
    color: inherit;
    font: inherit;
}

.dev-entry.clickable {
    cursor: pointer;
    transition: 0.1s all;
}

.dev-entry.clickable:hover,
.dev-entry.clickable:focus-visible {
    background: rgba(0, 0, 0, 0.6);
    border-left-color: #ffcc00;
}

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
    color: rgba(255, 255, 255, 0.8);
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    font-size: 1em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
}

.dev-more {
    margin-top: 5px;
    font-size: 0.8em;
    font-weight: 600;
    color: #ffcc00;
}
</style>
