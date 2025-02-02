<template>
    <div class="initial-setup fullsize flex-center">
        <h1>Initial Setup</h1>
        <h4>{{ text }}</h4>
        <h2 v-if="downloadPercent < 1">{{ (downloadPercent * 100).toFixed(0) }}%</h2>
    </div>
</template>

<script lang="ts" setup>
import { defaultMaps } from "@main/config/default-maps";
import { LATEST_GAME_VERSION } from "@main/config/default-versions";
import { DownloadInfo } from "@main/content/downloads";
import { initBattleStore } from "@renderer/store/battle.store";
import { db } from "@renderer/store/db";
import { downloadsStore } from "@renderer/store/downloads.store";
import { enginesStore } from "@renderer/store/engine.store";
import { downloadGame } from "@renderer/store/game.store";
import { onMounted, ref, watch } from "vue";

const emit = defineEmits<{
    (event: "complete"): void;
}>();

const text = ref("");
const state = ref<"engine" | "game" | "maps">("engine");

onMounted(async () => {
    console.debug("Initial setup");
    const latestKnownEngineVersion = enginesStore.availableEngineVersions.at(-1);
    if (latestKnownEngineVersion?.installed === false) {
        state.value = "engine";
        text.value = "Downloading engine";
        await window.engine.downloadEngine(latestKnownEngineVersion.id);
        text.value = "Installing engine";
    }

    state.value = "game";
    text.value = "Downloading game";
    await downloadGame(LATEST_GAME_VERSION);
    text.value = "Installing game";

    const installedMaps = await db.maps.count();
    if (installedMaps === 0) {
        state.value = "maps";
        text.value = "Downloading maps";
        await window.maps.downloadMaps(defaultMaps);
    }

    await initBattleStore();
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
