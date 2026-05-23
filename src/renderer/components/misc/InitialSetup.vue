<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="initial-setup fullsize flex-center">
        <h1>{{ title }}</h1>
        <h4>{{ text }}</h4>
        <Progress :percent="overallProgress" :height="40" style="width: 70%" themed pulsating />
        <template v-if="isDownloadPhase">
            <div v-if="isExtracting" class="initial-setup__detail">
                <Icon :icon="loadingIcon" class="initial-setup__spinner" />
                <span>{{ t("lobby.navbar.downloads.extracting") }}</span>
            </div>
            <div v-else-if="currentDownload" class="initial-setup__detail initial-setup__detail--text">
                {{ progressDetail }}
            </div>
            <div v-else class="initial-setup__detail">
                <Icon :icon="loadingIcon" class="initial-setup__spinner" />
            </div>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "$/jaz-ts-utils/object";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import loadingIcon from "@iconify-icons/mdi/loading";
import { useTypedI18n } from "@renderer/i18n";

import Progress from "@renderer/components/common/Progress.vue";
import { audioApi } from "@renderer/audio/audio";
import { backgroundImages, fontFiles } from "@renderer/assets/assetFiles";
import { fetchMissingMapImages, initMapsStore } from "@renderer/store/maps.store";
import { initReplaysStore } from "@renderer/store/replays.store";
import { db, initDb } from "@renderer/store/db";
import { defaultMaps } from "@main/config/default-maps";
import { LATEST_GAME_VERSION } from "@main/config/default-versions";
import { initBattleStore } from "@renderer/store/battle.store";
import { enginesStore } from "@renderer/store/engine.store";
import { downloadGame } from "@renderer/store/game.store";
import { useDownloadProgress } from "@renderer/composables/useDownloadProgress";

const PRELOAD_WEIGHT = 0.05;
const DOWNLOAD_FILL = 0.8;

const { t } = useTypedI18n();
const { allDownloads, totalDownloadPercent, progressText } = useDownloadProgress();

const emit = defineEmits(["complete"]);

const title = ref(t("lobby.components.misc.preloader.loading"));
const text = ref("");
const isDownloadPhase = ref(false);
const displayStage = ref<"engine" | "game" | "maps" | "update">("engine");

const overallProgress = ref(0);
let stageStart = 0;
let stageEnd = 0;

const currentDownload = computed(() => allDownloads.value[0] ?? null);
const isExtracting = computed(() => currentDownload.value?.phase === "extracting");

let extractionTimer: ReturnType<typeof setInterval> | null = null;

watch(isExtracting, (nowExtracting) => {
    if (nowExtracting) {
        if (displayStage.value === "engine") {
            text.value = t("lobby.components.misc.initialSetup.installingEngine");
        } else if (displayStage.value === "game") {
            text.value = t("lobby.components.misc.initialSetup.installingGame");
        }
        const extractionEnd = stageEnd;
        extractionTimer = setInterval(() => {
            const remaining = extractionEnd - overallProgress.value;
            if (remaining > 0.005) {
                overallProgress.value += remaining * 0.03;
            }
        }, 200);
    } else if (extractionTimer) {
        clearInterval(extractionTimer);
        extractionTimer = null;
    }
});

onUnmounted(() => {
    if (extractionTimer) clearInterval(extractionTimer);
});

const progressDetail = computed(() => {
    const download = currentDownload.value;
    if (!download || download.currentBytes === 0) return t("lobby.navbar.downloads.starting");
    return progressText(download);
});

function beginStage(start: number, end: number) {
    stageStart = start;
    stageEnd = end;
}

function completeStage() {
    overallProgress.value = stageEnd;
}

watch(totalDownloadPercent, (pct) => {
    const newVal = stageStart + (stageEnd - stageStart) * DOWNLOAD_FILL * pct;
    if (newVal > overallProgress.value) {
        overallProgress.value = newVal;
    }
});

const randomBackgroundImage = randomFromArray(Object.values(backgroundImages));
document.documentElement.style.setProperty("--background", `url(${randomBackgroundImage})`);

const preloadSteps: [string, () => Promise<unknown>][] = [
    [t("lobby.components.misc.preloader.loadingFonts"), loadAllFonts],
    [t("lobby.components.misc.preloader.initializingIndexDB"), initDb],
    [t("lobby.components.misc.preloader.initializingMaps"), initMapsStore],
    [t("lobby.components.misc.preloader.fetchingMissingMapImages"), fetchMissingMapImages],
    [t("lobby.components.misc.preloader.initializingReplays"), initReplaysStore],
];

const preloadStepWeight = PRELOAD_WEIGHT / preloadSteps.length;

interface DownloadStage {
    id: "engine" | "game" | "maps" | "update";
    weight: number;
    run: () => Promise<void>;
}

onMounted(async () => {
    // Phase 1: Preload
    for (const [label, thing] of preloadSteps) {
        text.value = label;
        await thing();
        overallProgress.value += preloadStepWeight;
    }
    audioApi.load();
    window.barNavigation.signalReady();
    overallProgress.value = PRELOAD_WEIGHT;

    // Phase 2: Downloads
    isDownloadPhase.value = true;
    title.value = t("lobby.components.misc.initialSetup.title");

    const needsEngine = !enginesStore.selectedEngineVersion || enginesStore.selectedEngineVersion.installed === false;
    const installedMaps = await db.maps.count();
    const needsMaps = installedMaps === 0;

    const stages: DownloadStage[] = [];

    if (needsEngine) {
        stages.push({
            id: "engine",
            weight: 1,
            run: async () => {
                displayStage.value = "engine";
                text.value = t("lobby.components.misc.initialSetup.downloadingEngine");
                await window.engine.downloadEngine();
            },
        });
    }

    stages.push({
        id: "game",
        weight: 8,
        run: async () => {
            displayStage.value = "game";
            text.value = t("lobby.components.misc.initialSetup.downloadingGame");
            await window.game.preloadPoolData();
            await downloadGame(LATEST_GAME_VERSION);
        },
    });

    if (needsMaps) {
        stages.push({
            id: "maps",
            weight: 2,
            run: async () => {
                displayStage.value = "maps";
                text.value = t("lobby.components.misc.initialSetup.downloadingMaps");
                await window.maps.downloadMaps(defaultMaps);
            },
        });
    }

    const needsUpdate = await window.autoUpdater.checkForUpdates();
    if (needsUpdate) {
        stages.push({
            id: "update",
            weight: 1,
            run: async () => {
                displayStage.value = "update";
                text.value = t("lobby.components.misc.initialSetup.downloadingUpdate");
                await window.autoUpdater.downloadUpdate();
                text.value = t("lobby.components.misc.initialSetup.installingUpdate");
                await window.autoUpdater.installUpdates();
            },
        });
    }

    const totalWeight = stages.reduce((sum, s) => sum + s.weight, 0);
    let cursor = PRELOAD_WEIGHT;

    for (const stage of stages) {
        const stageSize = (1 - PRELOAD_WEIGHT) * (stage.weight / totalWeight);
        beginStage(cursor, cursor + stageSize);
        await stage.run();
        completeStage();
        cursor += stageSize;
    }

    overallProgress.value = 1;

    await initBattleStore();
    emit("complete");
});

async function loadAllFonts() {
    const promises: Promise<unknown>[] = [];
    for (const fontFile of Object.values(fontFiles)) {
        promises.push(loadFont(fontFile));
    }
    await Promise.all(promises);
}

async function loadFont(url: string) {
    const fileName = url.split("/").pop()!.split(".")[0];
    const [family, weight, style] = fileName.split("-");
    const font = new FontFace(family, `url(${url})`, { weight, style });
    document.fonts.add(font);
    return font.load();
}
</script>

<style lang="scss" scoped>
.initial-setup {
    flex-direction: column;
    gap: 8px;
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);

    &__detail {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        color: rgba(255, 255, 255, 0.7);
        margin-top: 4px;

        &--text {
            font-size: 14px;
        }
    }
}
</style>
