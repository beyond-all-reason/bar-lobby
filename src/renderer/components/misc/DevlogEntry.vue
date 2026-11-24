<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="dev-entry" :class="{ clickable: entry?.link }" @click="openEntry">
        <div class="dev-title">
            {{ title }}
        </div>
        <div v-if="entry?.published" class="dev-date">
            {{ formatDistanceToNow(entry.published, { addSuffix: true }) }}
        </div>
        <div ref="desc" class="dev-desc">{{ description }}</div>
        <div v-if="truncated && entry?.link" class="read-more">{{ t("lobby.components.misc.devlogFeed.readMore") }}</div>
    </div>
</template>
<script lang="ts" setup>
import { NewsFeedEntry } from "@main/services/news.service";
import { formatDistanceToNow } from "date-fns";
import { computed, ref, useTemplateRef } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useTypedI18n } from "@renderer/i18n";
import { shellApi } from "@renderer/api/shell";

const { entry } = defineProps<{ entry: NewsFeedEntry | undefined }>();
const { t } = useTypedI18n();

const title = computed(() => entry?.title?.replace(" ⇀ Microblog ★ Beyond All Reason RTS", ""));
const description = computed(() => entry?.description?.split("|")[1]?.trim());

// "Read more" only shows when the description is cut off by the line clamp.
const desc = useTemplateRef<HTMLElement>("desc");
const truncated = ref(false);
useResizeObserver(desc, () => {
    if (desc.value) truncated.value = desc.value.scrollHeight > desc.value.clientHeight;
});

function openEntry() {
    if (entry?.link) shellApi.openInBrowser(entry.link);
}
</script>
<style lang="scss" scoped>
.dev-entry {
    padding: 10px 12px;
    margin-bottom: 10px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.15);
    transition: 0.1s all;

    &.clickable {
        cursor: pointer;
        &:hover {
            background: rgba(0, 0, 0, 0.75);
            border-color: rgba(255, 255, 255, 0.5);
        }
    }
}

.dev-title {
    font-size: 1.2em;
    font-weight: 600;
}

.dev-date {
    font-size: 0.8em;
    margin-bottom: 5px;
    color: rgba(255, 255, 255, 0.6);
}

.dev-desc {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
}

.read-more {
    margin-top: 5px;
    color: #ffcc00;
    font-weight: 600;
}
</style>
