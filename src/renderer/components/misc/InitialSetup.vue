<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="initial-setup fullsize flex-center">
        <h1>{{ t("lobby.components.misc.initialSetup.title") }}</h1>
        <div class="initial-setup__status">
            <h4 class="initial-setup__label">{{ text }}</h4>
            <div v-if="isExtracting" class="initial-setup__extracting">
                <Loader :absolute-position="false" />
                <span>{{ t("lobby.navbar.downloads.extracting") }}</span>
            </div>
            <template v-else-if="currentDownload">
                <Progress :percent="downloadPercent" :height="16" themed pulsating />
                <div class="initial-setup__detail">{{ progressDetail }}</div>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";

import Loader from "@renderer/components/common/Loader.vue";
import Progress from "@renderer/components/common/Progress.vue";
import { defaultMaps } from "@main/config/default-maps";
import { LATEST_GAME_VERSION } from "@main/config/default-versions";
import type { DownloadInfo } from "@main/content/downloads";
import { initBattleStore } from "@renderer/store/battle.store";
import { db } from "@renderer/store/db";
import { downloadsStore } from "@renderer/store/downloads.store";
import { enginesStore } from "@renderer/store/engine.store";
import { downloadGame } from "@renderer/store/game.store";
import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

const emit = defineEmits<{
    (event: "complete"): void;
}>();

const text = ref("");
const state = ref<"engine" | "game" | "maps" | "update">("engine");

const activeDownloads = computed(() => [
    ...downloadsStore.engineDownloads,
    ...downloadsStore.gameDownloads,
    ...downloadsStore.mapDownloads,
    ...downloadsStore.updateDownloads,
]);

const currentDownload = computed(() => activeDownloads.value[0] ?? null);

const isExtracting = computed(() => currentDownload.value?.phase === "extracting");

const downloadPercent = computed(() => {
    if (activeDownloads.value.length === 0) return 0;
    let currentBytes = 0;
    let totalBytes = 0;
    for (const d of activeDownloads.value) {
        currentBytes += d.currentBytes;
        totalBytes += d.totalBytes;
    }
    return currentBytes / totalBytes || 0;
});

watch(isExtracting, (nowExtracting) => {
    if (!nowExtracting) return;
    if (state.value === "engine") {
        text.value = t("lobby.components.misc.initialSetup.installingEngine");
    } else if (state.value === "game") {
        text.value = t("lobby.components.misc.initialSetup.installingGame");
    }
});

interface SpeedEntry {
    prevBytes: number;
    prevTime: number;
    speed: number;
}
const speedTracker = new Map<string, SpeedEntry>();

const progressDetail = computed(() => {
    const download = currentDownload.value;
    if (!download || download.currentBytes === 0) return t("lobby.navbar.downloads.starting");
    return buildProgressText(download);
});

function buildProgressText(download: DownloadInfo): string {
    const now = Date.now();
    const key = download.name;
    const prev = speedTracker.get(key);
    let speed = 0;
    if (prev) {
        const dt = (now - prev.prevTime) / 1000;
        if (dt > 0.25) {
            const raw = (download.currentBytes - prev.prevBytes) / dt;
            speed = raw > 0 ? prev.speed * 0.7 + raw * 0.3 : prev.speed * 0.9;
            speedTracker.set(key, { prevBytes: download.currentBytes, prevTime: now, speed });
        } else {
            speed = prev.speed;
        }
    } else {
        speedTracker.set(key, { prevBytes: download.currentBytes, prevTime: now, speed: 0 });
    }
    const cur = (download.currentBytes / (1024 * 1024)).toFixed(1);
    const tot = (download.totalBytes / (1024 * 1024)).toFixed(1);
    const pct = ((download.currentBytes / download.totalBytes) * 100).toFixed(1);
    let text = `${cur} / ${tot} MB (${pct}%)`;
    if (speed > 0) {
        text += ` · ${formatSpeed(speed)}`;
        const remaining = download.totalBytes - download.currentBytes;
        if (remaining > 0) text += ` · ${formatEta(remaining / speed)}`;
    }
    return text;
}

function formatSpeed(bps: number): string {
    if (bps >= 1024 * 1024) return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bps >= 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${bps.toFixed(0)} B/s`;
}

function formatEta(seconds: number): string {
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds)}s`;
}

onMounted(async () => {
    console.debug("Initial setup");
    if (!enginesStore.selectedEngineVersion || enginesStore.selectedEngineVersion.installed === false) {
        state.value = "engine";
        text.value = t("lobby.components.misc.initialSetup.downloadingEngine");
        await window.engine.downloadEngine();
    }

    state.value = "game";
    text.value = t("lobby.components.misc.initialSetup.downloadingGame");
    await window.game.preloadPoolData();
    await downloadGame(LATEST_GAME_VERSION);

    const installedMaps = await db.maps.count();
    if (installedMaps === 0) {
        state.value = "maps";
        text.value = t("lobby.components.misc.initialSetup.downloadingMaps");
        await window.maps.downloadMaps(defaultMaps);
    }

    const updateAvailable = await window.autoUpdater.checkForUpdates();
    if (updateAvailable) {
        state.value = "update";
        text.value = t("lobby.components.misc.initialSetup.downloadingUpdate");
        await window.autoUpdater.downloadUpdate();
        text.value = t("lobby.components.misc.initialSetup.installingUpdate");
        await window.autoUpdater.installUpdates();
    }

    await initBattleStore();
    emit("complete");
});
</script>

<style lang="scss" scoped>
.initial-setup {
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
    flex-direction: column;
    gap: 8px;

    &__status {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        width: 60%;
    }

    &__label {
        margin: 0;
    }

    &__detail {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.65);
    }

    &__extracting {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        color: rgba(255, 255, 255, 0.7);
    }
}
</style>
