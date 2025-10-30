<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Progress
        :class="{ pulse: isDownloading }"
        :percent="downloadPercent"
        v-if="true"
        :percentStr="downloadPercent"
        :height="height"
    ></Progress>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { downloadsStore } from "@renderer/store/downloads.store";
import Progress from "@renderer/components/common/Progress.vue";

const props = defineProps<{
    mapName?: string;
    height: number;
    game?: string;
    engine?: string;
}>();

const isMapDownloading = computed(() => {
    if (props.mapName == undefined) {
        return false;
    }
    const downloads = downloadsStore.mapDownloads;
    for (const download of downloads) {
        if (download.name === props.mapName) {
            return true;
        }
    }
    return false;
});
const isEngineDownloading = computed(() => {
    if (props.engine == undefined) {
        return false;
    }
    const downloads = downloadsStore.engineDownloads;
    for (const download of downloads) {
        if (download.name === props.engine) {
            return true;
        }
    }
    return false;
});
const isGameDownloading = computed(() => {
    if (props.game == undefined) {
        return false;
    }
    const downloads = downloadsStore.gameDownloads;
    for (const download of downloads) {
        if (download.name === props.game) {
            return true;
        }
    }
    return false;
});

const isDownloading = computed(() => {
    return isMapDownloading.value || isEngineDownloading.value || isGameDownloading.value;
});

const downloadPercent = computed(() => {
    const downloads = [...downloadsStore.mapDownloads, ...downloadsStore.engineDownloads, ...downloadsStore.gameDownloads];
    const count = downloads.length;
    let progress: number = 0;
    for (const download of downloads) {
        if (download.name === props.mapName || download.name === props.engine || download.name === props.game) {
            progress += download.progress;
        }
    }
    return progress / count;
});
</script>
