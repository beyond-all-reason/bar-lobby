<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="initial-setup fullsize flex-center">
        <template v-if="state === 'path-selection'">
            <h1>{{ t("lobby.components.misc.initialSetup.title") }}</h1>
            <h4>{{ t("lobby.components.misc.initialSetup.selectAssetsPathDescription") }}</h4>
            <div class="path-selector">
                <Textbox :model-value="selectedPath" readonly />
                <Button @click="browseForFolder">{{ t("lobby.components.misc.initialSetup.browse") }}</Button>
            </div>
            <Button class="green" @click="confirmPath">{{ t("lobby.components.misc.initialSetup.continue") }}</Button>
        </template>
        <template v-else>
            <h1>{{ t("lobby.components.misc.initialSetup.title") }}</h1>
            <h4>{{ text }}</h4>
            <h2 v-if="downloadPercent < 1">{{ (downloadPercent * 100).toFixed(0) }}%</h2>
        </template>
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
import { useTypedI18n } from "@renderer/i18n";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";

const { t } = useTypedI18n();

const emit = defineEmits<{
    (event: "complete"): void;
}>();

const text = ref("");
const state = ref<"path-selection" | "engine" | "game" | "maps" | "update">("engine");
const selectedPath = ref("");

let resolvePathConfirm!: () => void;
const pathConfirmPromise = new Promise<void>((resolve) => {
    resolvePathConfirm = resolve;
});

async function browseForFolder() {
    const chosen = await window.paths.selectFolder();
    if (chosen) {
        selectedPath.value = chosen;
    }
}

async function confirmPath() {
    await window.paths.reinit(selectedPath.value);
    resolvePathConfirm();
}

onMounted(async () => {
    console.debug("Initial setup");
    if (!enginesStore.selectedEngineVersion || enginesStore.selectedEngineVersion.installed === false) {
        selectedPath.value = await window.paths.getCurrentAssetsPath();
        state.value = "path-selection";
        await pathConfirmPromise;

        state.value = "engine";
        text.value = t("lobby.components.misc.initialSetup.downloadingEngine");
        await window.engine.downloadEngine();
        text.value = t("lobby.components.misc.initialSetup.installingEngine");
    }

    state.value = "game";
    text.value = t("lobby.components.misc.initialSetup.downloadingGame");
    await window.game.preloadPoolData();
    await downloadGame(LATEST_GAME_VERSION);
    text.value = t("lobby.components.misc.initialSetup.installingGame");

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

watch(
    () => downloadsStore.updateDownloads,
    () => {
        downloadPercent.value = calculateDownloadPercent(downloadsStore.updateDownloads);
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

.path-selector {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
    width: 500px;
    margin-bottom: 16px;

    .textbox {
        flex: 1;
    }
}
</style>
