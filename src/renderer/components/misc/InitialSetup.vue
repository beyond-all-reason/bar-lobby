<template>
    <div class="initial-setup fullsize flex-center">
        <h1>Initial Setup</h1>
        <h4>{{ text }}</h4>
        <h2 v-if="downloadPercent < 1">{{ (downloadPercent * 100).toFixed(2) }}%</h2>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

import { defaultMaps } from "@/config/default-maps";
import { defaultEngineVersion, defaultGameVersion } from "@/config/default-versions";

const emit = defineEmits<{
    (event: "complete"): void;
}>();

const text = ref("");

onMounted(async () => {
    console.debug("Initial setup");

    if (api.content.engine.installedVersions.length === 0) {
        text.value = "Downloading engine";
        await api.content.engine.downloadEngine(defaultEngineVersion);
        text.value = "Installing engine";
    }

    if (api.content.game.installedVersions.length === 0) {
        text.value = "Downloading game";
        await api.content.game.downloadGame(defaultGameVersion);
        text.value = "Installing game";
    }

    if (Object.keys(api.content.maps.installedVersions).length === 0) {
        text.value = "Downloading maps";
        await api.content.maps.downloadMaps(defaultMaps);
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

<style lang="scss" scoped>
.initial-setup {
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
}
</style>
