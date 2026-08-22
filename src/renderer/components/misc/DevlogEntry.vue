<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <button class="dev-entry" type="button" @click="openEntry">
        <span class="dev-title">{{ title }}</span>
        <span v-if="entry.published" class="dev-date">
            {{ formatDistanceToNow(entry.published, { addSuffix: true }) }}
        </span>
        <span ref="descriptionEl" class="dev-desc">{{ description }}</span>
        <span v-if="isTruncated" class="dev-more">{{ t("lobby.buttons.readMore") }}</span>
    </button>
</template>
<script lang="ts" setup>
import { NewsFeedEntry } from "@main/services/news.service";
import { formatDistanceToNow } from "date-fns";
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { useTypedI18n } from "@renderer/i18n";
import { shellApi } from "@renderer/api/shell";

const { t } = useTypedI18n();

const { entry } = defineProps<{ entry: NewsFeedEntry }>();

const title = computed(() => entry.title?.replace(" ⇀ Microblog ★ Beyond All Reason RTS", ""));
// The feed prefixes the body with "<author> | ", and bodies contain pipes of their own.
const description = computed(() => entry.description?.split("|").slice(1).join("|").trim());

// "Read more" is only honest when the preview actually hides something, which depends on how
// the clamped text lays out rather than on the entry itself.
const descriptionEl = useTemplateRef<HTMLElement>("descriptionEl");
const isTruncated = ref(false);
const measure = () => {
    const el = descriptionEl.value;
    isTruncated.value = !!entry.link && !!el && el.scrollHeight > el.clientHeight;
};
onMounted(measure);
useResizeObserver(descriptionEl, measure);

const openEntry = () => {
    if (entry.link) shellApi.openInBrowser(entry.link);
};
</script>
<style lang="css" scoped>
.dev-entry {
    display: block;
    inline-size: 100%;
    margin-block-end: 15px;
    padding: 10px;
    border-inline-start: 2px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.35);
    transition: 0.1s all;
}

.dev-entry:hover,
.dev-entry:focus-visible {
    background: rgba(0, 0, 0, 0.6);
    border-inline-start-color: var(--accent-color);
}

.dev-title,
.dev-date,
.dev-desc,
.dev-more {
    display: block;
    filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
}

.dev-title {
    font-size: 1.2em;
    font-weight: semibold;
}

.dev-date {
    font-size: 0.8em;
    margin-block-end: 5px;
    color: rgba(255, 255, 255, 0.6);
}

.dev-desc {
    color: rgba(255, 255, 255, 0.8);
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
}

.dev-more {
    margin-block-start: 5px;
    font-size: 0.8em;
    font-weight: 600;
    color: var(--accent-color);
}
</style>
