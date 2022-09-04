<template>
    <div class="fullsize flex-center">
        <h1>Initial Setup</h1>
        <h4>{{ text }}</h4>
        <h2 v-if="downloadPercent < 1">{{ (downloadPercent * 100).toFixed(2) }}%</h2>
    </div>
</template>

<script lang="ts" setup>
import { lastInArray } from "jaz-ts-utils";
import * as path from "path";
import { computed, onMounted, ref } from "vue";

import { defaultMaps } from "@/config/default-maps";

const emit = defineEmits<{
    (event: "complete"): void;
}>();

const text = ref("");

onMounted(async () => {
    console.debug("Initial setup");

    if (api.content.engine.installedVersions.length === 0) {
        text.value = "Downloading engine";
        await api.content.engine.downloadLatestEngine();
        text.value = "Installing engine";
    }

    const engine = lastInArray(api.content.engine.installedVersions)!;
    const binaryName = process.platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
    const prBinaryPath = path.join(api.info.contentPath, "engine", engine, binaryName);
    await api.content.game.init(prBinaryPath);

    if (api.content.game.installedVersions.length === 0) {
        text.value = "Downloading game";
        await api.content.game.updateGame();
        text.value = "Installing game";
    }

    await api.content.maps.init();

    if (Object.keys(api.content.maps.installedMaps).length === 0) {
        text.value = "Downloading maps";
        await api.content.maps.installMaps(defaultMaps);
    }

    emit("complete");
});

const downloadPercent = computed(() => {
    const downloads = api.content.engine.currentDownloads.concat(api.content.game.currentDownloads, api.content.maps.currentDownloads);

    if (downloads.length === 0) {
        return 1;
    }

    let currentBytes = 0;
    let totalBytes = 0;

    for (const download of downloads) {
        currentBytes += download.currentBytes;
        totalBytes += download.totalBytes;
    }

    return currentBytes / totalBytes || 0;
});
</script>

<style lang="scss" scoped></style>
