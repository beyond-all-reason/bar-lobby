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
import { computed } from "vue";
import { downloadsStore } from "@renderer/store/downloads.store";
import Progress from "@renderer/components/common/Progress.vue";

const props = defineProps(["mapName","height"]);

const isDownloading = computed(() => {
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

const downloadPercent = computed(() => {
    if (props.mapName == undefined) {
        return 0;
    }
    const downloads = downloadsStore.mapDownloads;
    let progress = 0;
    for (const download of downloads) {
        if (download.name === props.mapName) {
            progress = download.progress;
        }
    }
    return progress;
});
</script>
