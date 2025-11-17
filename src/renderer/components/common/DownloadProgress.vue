<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Progress
        :class="{ pulse: isDownloading }"
        :percent="downloadPercent"
        v-if="isDownloading"
        :percentStr="downloadPercent"
        :height="height"
    ></Progress>
</template>

<script lang="ts" setup>
import { computed, watch } from "vue";
import { downloadsStore } from "@renderer/store/downloads.store";
import Progress from "@renderer/components/common/Progress.vue";

interface Props {
    maps?: string[];
    height: number;
    games?: string[];
    engines?: string[];
}

const { maps = [], height = 100, games = [], engines = [] } = defineProps<Props>();

const emit = defineEmits<{
    statusChange: [value: boolean];
}>();

const isDownloading = computed(() => {
    const targetList = new Set([...maps, ...games, ...engines]);
    if (targetList.size == 0) return false;
    const downloads = [...downloadsStore.mapDownloads, ...downloadsStore.engineDownloads, ...downloadsStore.gameDownloads];
    if (downloads.length == 0) return false;
    const downloadingNames = new Set(downloads.map((d) => d.name));
    if (downloadingNames.intersection(targetList).size > 0) {
        return true;
    }
    return false;
});

watch(isDownloading, (value) => {
    emit("statusChange", value);
});

const downloadPercent = computed(() => {
    const targetList = new Set([...maps, ...games, ...engines]);
    const downloads = [...downloadsStore.mapDownloads, ...downloadsStore.engineDownloads, ...downloadsStore.gameDownloads];
    const count = downloads.length;
    let progress: number = 0;
    for (const download of downloads) {
        if (targetList.has(download.name)) {
            progress += download.progress;
        }
    }
    return progress / count;
});
</script>
