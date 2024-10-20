<template>
    <div class="initial-setup fullsize flex-center">
        <h1>Initial Setup</h1>
        <h4>{{ text }}</h4>
        <h2 v-if="downloadPercent < 1">{{ (downloadPercent * 100).toFixed(0) }}%</h2>
    </div>
</template>

<script lang="ts" setup>
import { defaultMaps } from "@main/config/default-maps";
import { DEFAULT_ENGINE_VERSION, DEFAULT_GAME_VERSION } from "@main/config/default-versions";
import { DownloadInfo } from "@main/content/downloads";
import { db } from "@renderer/store/db";
import { downloadsStore } from "@renderer/store/downloads.store";
import { onMounted, ref, watch } from "vue";

const emit = defineEmits<{
    (event: "complete"): void;
}>();

const text = ref("");
const state = ref<"engine" | "game" | "maps">("engine");

onMounted(async () => {
    console.debug("Initial setup");
    const installedEngineVersions = await window.engine.getInstalledVersions();
    if (installedEngineVersions.length === 0) {
        state.value = "engine";
        text.value = "Downloading engine";
        await window.engine.downloadEngine(DEFAULT_ENGINE_VERSION);
        text.value = "Installing engine";
    }
    const installedGameVersions = await window.game.getInstalledVersions();
    if (installedGameVersions.length === 0) {
        state.value = "game";
        text.value = "Downloading game";
        await window.game.downloadGame(DEFAULT_GAME_VERSION);
        text.value = "Installing game";
    }
    const installedMaps = await db.maps.count();
    if (installedMaps === 0) {
        state.value = "maps";
        text.value = "Downloading maps";
        await window.maps.downloadMaps(defaultMaps);
    }
    emit("complete");
});

const downloadPercent = ref(0);

watch(
    downloadsStore.engineDownloads,
    () => {
        downloadPercent.value = calculateDownloadPercent(downloadsStore.engineDownloads);
    },
    { deep: true }
);

watch(
    downloadsStore.gameDownloads,
    () => {
        downloadPercent.value = calculateDownloadPercent(downloadsStore.gameDownloads);
    },
    { deep: true }
);

watch(
    downloadsStore.mapDownloads,
    () => {
        downloadPercent.value = calculateDownloadPercent(downloadsStore.mapDownloads);
    },
    { deep: true }
);

function calculateDownloadPercent(downloads: DownloadInfo[]): number {
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
}
</script>

<style lang="scss" scoped>
.initial-setup {
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
}
</style>
