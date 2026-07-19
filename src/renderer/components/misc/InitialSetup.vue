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
            <h1>{{ title }}</h1>
            <h4 :class="{ 'status-error': stepError, 'status-warning': stepRetrying }">{{ text }}</h4>
            <Progress :percent="overallProgress" :height="40" style="width: 70%" themed pulsating />
            <template v-if="isDownloadPhase">
                <div class="action-slot">
                    <template v-if="stepError">
                        <Button class="green" @click="retryCurrentStep">{{ t("lobby.components.misc.initialSetup.retry") }}</Button>
                        <Button v-if="canSkipCurrentStep" class="red" @click="skipCurrentStep">{{
                            t("lobby.components.misc.initialSetup.skip")
                        }}</Button>
                    </template>
                    <template v-else>
                        <div v-if="isExtracting" class="initial-setup__detail">
                            <Loader class="initial-setup__spinner" :absolute-position="false" />
                            <span>{{ t("lobby.navbar.downloads.extracting") }}</span>
                        </div>
                        <div v-else-if="currentDownload" class="initial-setup__detail initial-setup__detail--text">
                            {{ progressDetail }}
                        </div>
                        <div v-else class="initial-setup__detail">
                            <Loader class="initial-setup__spinner" :absolute-position="false" />
                        </div>
                    </template>
                </div>
                <div class="play-offline-action">
                    <Button class="blue" @click="skipAllSteps">{{ t("lobby.components.misc.initialSetup.playOffline") }}</Button>
                </div>
            </template>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { delay } from "$/jaz-ts-utils/delay";
import { randomFromArray } from "$/jaz-ts-utils/object";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import Loader from "@renderer/components/common/Loader.vue";
import Progress from "@renderer/components/common/Progress.vue";
import { audioApi } from "@renderer/audio/audio";
import { backgroundImages, fontFiles } from "@renderer/assets/assetFiles";
import { fetchMissingMapImages, initMapsStore, syncMapsMetadata } from "@renderer/store/maps.store";
import { initReplaysStore } from "@renderer/store/replays.store";
import { db, initDb } from "@renderer/store/db";
import { defaultMaps } from "@main/config/default-maps";
import { LATEST_GAME_VERSION } from "@main/config/default-versions";
import { initBattleStore } from "@renderer/store/battle.store";
import { enginesStore } from "@renderer/store/engine.store";
import { downloadGame, gameStore } from "@renderer/store/game.store";
import { downloadsStore } from "@renderer/store/downloads.store";
import { useDownloadProgress } from "@renderer/composables/useDownloadProgress";

const PRELOAD_WEIGHT = 0.05;
const DOWNLOAD_FILL = 0.8;
const AUTO_RETRY_ATTEMPTS = 3;
const AUTO_RETRY_DELAY_MS = 2000;

const { t } = useTypedI18n();
const { allDownloads, totalDownloadPercent, progressText } = useDownloadProgress();

const emit = defineEmits(["complete"]);

interface DownloadStage {
    id: "engine" | "game" | "maps" | "update";
    label: string;
    weight: number;
    canSkip: () => boolean;
    run: () => Promise<void>;
}

const title = ref(t("lobby.components.misc.preloader.loading"));
const text = ref("");
const state = ref<"path-selection" | "engine" | "game" | "maps" | "update">("engine");
const selectedPath = ref("");
const isDownloadPhase = ref(false);
const stepError = ref("");
const stepRetrying = ref(false);
const canSkipCurrentStep = ref(false);

const overallProgress = ref(0);
let stageStart = 0;
let stageEnd = 0;
let currentStage: DownloadStage | null = null;

let resolvePathConfirm: (() => void) | undefined;

const currentDownload = computed(() => allDownloads.value[0] ?? null);
const isExtracting = computed(() => currentDownload.value?.phase === "extracting");

const progressDetail = computed(() => {
    const download = currentDownload.value;
    if (!download || download.currentBytes === 0) return t("lobby.navbar.downloads.starting");
    return progressText(download);
});

// Single source of truth for "stop". Play Offline aborts; steps race against the signal.
const abortController = new AbortController();
const { signal: abortSignal } = abortController;

function abortPromise(): Promise<never> {
    return new Promise((_, reject) => {
        const err = () => reject(new DOMException("Setup aborted", "AbortError"));
        if (abortSignal.aborted) return err();
        abortSignal.addEventListener("abort", err, { once: true });
    });
}

let resolveStepError: ((action: "retry" | "skip") => void) | null = null;

function waitForUserAction(): Promise<"retry" | "skip"> {
    return new Promise((resolve) => {
        resolveStepError = resolve;
    });
}

function retryCurrentStep() {
    if (resolveStepError) {
        stepError.value = "";
        resolveStepError("retry");
        resolveStepError = null;
    }
}

function skipCurrentStep() {
    if (resolveStepError) {
        stepError.value = "";
        resolveStepError("skip");
        resolveStepError = null;
    }
}

function skipAllSteps() {
    abortController.abort();
    if (resolveStepError) {
        stepError.value = "";
        resolveStepError("skip");
        resolveStepError = null;
    }
}

let extractionTimer: ReturnType<typeof setInterval> | null = null;

watch(isExtracting, (nowExtracting) => {
    if (nowExtracting) {
        if (currentStage?.id === "engine") {
            text.value = t("lobby.components.misc.initialSetup.installingEngine");
        } else if (currentStage?.id === "game") {
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

// Surface pr-downloader retry signals (game/map) as "retrying" status text.
watch(
    () => downloadsStore.gameRetrying || downloadsStore.mapRetrying,
    (retrying) => {
        if (stepError.value || !currentStage) return;
        if (retrying) {
            stepRetrying.value = true;
            text.value = t("lobby.components.misc.initialSetup.stepRetrying", { step: currentStage.label });
        } else if (stepRetrying.value) {
            stepRetrying.value = false;
            text.value = currentStage.label;
        }
    }
);

watch(totalDownloadPercent, (pct) => {
    const newVal = stageStart + (stageEnd - stageStart) * DOWNLOAD_FILL * pct;
    if (newVal > overallProgress.value) {
        overallProgress.value = newVal;
    }
});

onUnmounted(() => {
    if (extractionTimer) clearInterval(extractionTimer);
});

function beginStage(start: number, end: number) {
    stageStart = start;
    stageEnd = end;
}

function completeStage() {
    overallProgress.value = stageEnd;
}

const randomBackgroundImage = randomFromArray(Object.values(backgroundImages));
document.documentElement.style.setProperty("--background", `url(${randomBackgroundImage})`);

const preloadSteps: [string, () => Promise<unknown>][] = [
    [t("lobby.components.misc.preloader.loadingFonts"), loadAllFonts],
    [t("lobby.components.misc.preloader.initializingIndexDB"), initDb],
    [t("lobby.components.misc.preloader.initializingMaps"), initMapsStore],
    [t("lobby.components.misc.preloader.initializingReplays"), initReplaysStore],
];

const preloadStepWeight = PRELOAD_WEIGHT / preloadSteps.length;

async function attemptStage(stage: DownloadStage): Promise<"done" | "aborted" | "failed"> {
    try {
        await Promise.race([stage.run(), abortPromise()]);
        return "done";
    } catch (error) {
        if (abortSignal.aborted) return "aborted";
        console.error(`Setup step "${stage.label}" failed:`, error);
        return "failed";
    }
}

async function runStage(stage: DownloadStage): Promise<boolean> {
    currentStage = stage;

    // First pass: one attempt plus AUTO_RETRY_ATTEMPTS-1 auto-retries.
    // After that, hand control to the user via Retry/Skip; each manual Retry
    // runs a SINGLE attempt before re-prompting, so the button comes back fast.
    let isManualRetry = false;
    while (!abortSignal.aborted) {
        const maxAttempts = isManualRetry ? 1 : AUTO_RETRY_ATTEMPTS;

        let result: "done" | "aborted" | "failed" = "failed";
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (abortSignal.aborted) return false;

            const retrying = isManualRetry || attempt > 0;
            stepRetrying.value = retrying;
            text.value = retrying ? t("lobby.components.misc.initialSetup.stepRetrying", { step: stage.label }) : stage.label;

            if (attempt > 0) {
                try {
                    await delay(AUTO_RETRY_DELAY_MS, abortSignal);
                } catch {
                    return false;
                }
            }

            result = await attemptStage(stage);
            if (result !== "failed") break;
        }

        if (result === "done") {
            stepRetrying.value = false;
            return true;
        }
        if (result === "aborted") return false;

        stepRetrying.value = false;
        text.value = t("lobby.components.misc.initialSetup.stepFailed", { step: stage.label });
        stepError.value = "failed";
        canSkipCurrentStep.value = stage.canSkip();

        const action = await waitForUserAction();
        if (action === "skip") return false;
        isManualRetry = true;
    }
    return false;
}

async function browseForFolder() {
    const chosen = await window.paths.selectFolder();
    if (chosen) {
        selectedPath.value = chosen;
    }
}

async function confirmPath() {
    await window.paths.changePath(selectedPath.value);
    resolvePathConfirm?.();
}

onMounted(async () => {
    console.debug("Initial setup");

    // Phase 1: Preload (local-first; failures degrade gracefully inside each step)
    for (const [label, thing] of preloadSteps) {
        if (abortSignal.aborted) break;
        text.value = label;
        try {
            await thing();
        } catch (error) {
            console.warn(`Preload step "${label}" failed`, error);
        }
        overallProgress.value += preloadStepWeight;
    }
    audioApi.load();
    window.barNavigation.signalReady();
    overallProgress.value = PRELOAD_WEIGHT;

    // Phase 2: Downloads
    isDownloadPhase.value = true;
    title.value = t("lobby.components.misc.initialSetup.title");

    const needsEngine = !enginesStore.selectedEngineVersion || enginesStore.selectedEngineVersion.installed === false;

    if (needsEngine) {
        selectedPath.value = await window.paths.getCurrentAssetsPath();
        state.value = "path-selection";
        await new Promise<void>((resolve) => {
            resolvePathConfirm = resolve;
        });
        state.value = "engine";
    }

    const stages: DownloadStage[] = [
        {
            id: "engine",
            label: t("lobby.components.misc.initialSetup.downloadingEngine"),
            weight: 1,
            canSkip: () => enginesStore.selectedEngineVersion?.installed === true,
            async run() {
                if (!enginesStore.selectedEngineVersion || enginesStore.selectedEngineVersion.installed === false) {
                    await window.engine.downloadEngine();
                }
            },
        },
        {
            id: "game",
            label: t("lobby.components.misc.initialSetup.downloadingGame"),
            weight: 8,
            canSkip: () => gameStore.availableGameVersions.size > 0,
            async run() {
                await window.game.preloadPoolData();
                await downloadGame(LATEST_GAME_VERSION);
                if (gameStore.selectedGameVersion === undefined) {
                    throw new Error("Game download did not complete successfully");
                }
            },
        },
        {
            id: "maps",
            label: t("lobby.components.misc.initialSetup.downloadingMaps"),
            weight: 2,
            canSkip: () => true,
            async run() {
                try {
                    await syncMapsMetadata();
                } catch (error) {
                    console.warn("Failed to sync maps metadata, continuing with cached data", error);
                }
                const installedMaps = await db.maps.filter((m) => m.isInstalled === true).count();
                if (installedMaps === 0) {
                    await window.maps.downloadMaps(defaultMaps);
                }
                try {
                    await fetchMissingMapImages();
                } catch (error) {
                    console.warn("Failed to fetch missing map images", error);
                }
            },
        },
        {
            id: "update",
            label: t("lobby.components.misc.initialSetup.downloadingUpdate"),
            weight: 1,
            canSkip: () => true,
            async run() {
                const updateAvailable = await window.autoUpdater.checkForUpdates();
                if (updateAvailable) {
                    await window.autoUpdater.downloadUpdate();
                    await window.autoUpdater.installUpdates();
                }
            },
        },
    ];

    const totalWeight = stages.reduce((sum, s) => sum + s.weight, 0);
    let cursor = PRELOAD_WEIGHT;

    for (const stage of stages) {
        if (abortSignal.aborted) break;
        const stageSize = (1 - PRELOAD_WEIGHT) * (stage.weight / totalWeight);
        beginStage(cursor, cursor + stageSize);
        await runStage(stage);
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

    &__spinner {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;

        :deep(.loader) {
            padding: 0;
        }

        :deep(.la-ball-clip-rotate-multiple) {
            width: 32px;
            height: 32px;
        }
    }
}

.status-error {
    color: rgb(239, 83, 80);
}

.status-warning {
    color: rgb(255, 183, 77);
}

.action-slot {
    display: flex;
    gap: 12px;
    min-height: 32px;
    align-items: center;
    justify-content: center;
}

.play-offline-action {
    margin-top: 16px;
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
