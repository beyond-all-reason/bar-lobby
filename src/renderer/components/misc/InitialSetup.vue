<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="initial-setup fullsize flex-center">
        <h1>{{ t("lobby.components.misc.initialSetup.title") }}</h1>
        <h4 :class="{ 'status-error': stepError, 'status-warning': stepRetrying }">{{ text }}</h4>
        <div class="action-slot">
            <template v-if="stepError">
                <Button class="green" @click="retryCurrentStep">{{ t("lobby.components.misc.initialSetup.retry") }}</Button>
                <Button v-if="canSkipCurrentStep" class="red" @click="skipCurrentStep">{{
                    t("lobby.components.misc.initialSetup.skip")
                }}</Button>
            </template>
            <h2 v-else-if="downloadPercent < 1">{{ (downloadPercent * 100).toFixed(0) }}%</h2>
        </div>
        <div class="play-offline-action">
            <Button class="blue" @click="skipAllSteps">{{ t("lobby.components.misc.initialSetup.playOffline") }}</Button>
        </div>
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
import { gameStore } from "@renderer/store/game.store";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import Button from "@renderer/components/controls/Button.vue";

const { t } = useTypedI18n();

const emit = defineEmits<{
    (event: "complete"): void;
}>();

const text = ref("");
const stepError = ref("");
const stepRetrying = ref(false);
const canSkipCurrentStep = ref(false);
const downloadPercent = ref(0);

let resolveStepError: ((action: "retry" | "skip") => void) | null = null;
let abortSetup = false;
let resolveAbort: (() => void) | null = null;

interface SetupStep {
    label: string;
    canSkip: () => boolean;
    action: () => Promise<void>;
}

function buildSteps(): SetupStep[] {
    return [
        {
            label: t("lobby.components.misc.initialSetup.downloadingEngine"),
            canSkip: () => enginesStore.selectedEngineVersion?.installed === true,
            async action() {
                if (!enginesStore.selectedEngineVersion || enginesStore.selectedEngineVersion.installed === false) {
                    await window.engine.downloadEngine();
                }
            },
        },
        {
            label: t("lobby.components.misc.initialSetup.downloadingGame"),
            canSkip: () => gameStore.availableGameVersions.size > 0,
            async action() {
                await window.game.preloadPoolData();
                await downloadGame(LATEST_GAME_VERSION);
                if (gameStore.selectedGameVersion === undefined) {
                    throw new Error("Game download did not complete successfully");
                }
            },
        },
        {
            label: t("lobby.components.misc.initialSetup.downloadingMaps"),
            canSkip: () => true,
            async action() {
                const installedMaps = await db.maps.filter((m) => m.isInstalled === true).count();
                console.log(installedMaps);
                if (installedMaps === 0) {
                    await window.maps.downloadMaps(defaultMaps);
                }
            },
        },
        {
            label: t("lobby.components.misc.initialSetup.downloadingUpdate"),
            canSkip: () => true,
            async action() {
                const updateAvailable = await window.autoUpdater.checkForUpdates();
                if (updateAvailable) {
                    await window.autoUpdater.downloadUpdate();
                    await window.autoUpdater.installUpdates();
                }
            },
        },
    ];
}

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
    abortSetup = true;
    // Wake up any in-flight step via the abort promise
    if (resolveAbort) {
        resolveAbort();
        resolveAbort = null;
    }
    if (resolveStepError) {
        stepError.value = "";
        resolveStepError("skip");
        resolveStepError = null;
    }
}

const AUTO_RETRY_ATTEMPTS = 3;
const AUTO_RETRY_DELAY_MS = 2000;
const STALL_THRESHOLD_MS = 10_000;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Track the current step label for UI updates from watchers
let currentStepLabel = "";

// Stall detection for engine downloads (axios — no built-in retry signals)
let lastProgressTime = Date.now();
let stallCheckInterval: ReturnType<typeof setInterval> | null = null;

function startStallDetection(step: SetupStep) {
    currentStepLabel = step.label;
    lastProgressTime = Date.now();
    stallCheckInterval = setInterval(() => {
        const stalled = Date.now() - lastProgressTime > STALL_THRESHOLD_MS;
        if (stalled && !stepError.value && !stepRetrying.value) {
            stepRetrying.value = true;
            text.value = t("lobby.components.misc.initialSetup.stepRetrying", { step: currentStepLabel });
        }
    }, 1000);
}

function stopStallDetection() {
    if (stallCheckInterval) {
        clearInterval(stallCheckInterval);
        stallCheckInterval = null;
    }
}

// When download progress resumes, clear stall-based warning (engine downloads)
watch(downloadPercent, () => {
    lastProgressTime = Date.now();
    if (stepRetrying.value && !stepError.value && stallCheckInterval) {
        stepRetrying.value = false;
        text.value = currentStepLabel;
    }
});

// pr-downloader retry signals (game and map downloads)
watch(
    () => downloadsStore.gameRetrying || downloadsStore.mapRetrying,
    (retrying) => {
        if (stepError.value) return;
        if (retrying) {
            stepRetrying.value = true;
            text.value = t("lobby.components.misc.initialSetup.stepRetrying", { step: currentStepLabel });
        } else if (stepRetrying.value) {
            stepRetrying.value = false;
            text.value = currentStepLabel;
        }
    }
);

onUnmounted(() => {
    stopStallDetection();
});

async function attemptStep(step: SetupStep): Promise<"done" | "aborted" | "failed"> {
    try {
        const abortPromise = new Promise<void>((resolve) => {
            resolveAbort = resolve;
        });
        const result = await Promise.race([step.action().then(() => "done" as const), abortPromise.then(() => "aborted" as const)]);
        return result;
    } catch (error) {
        if (abortSetup) return "aborted";
        console.error(`Setup step "${step.label}" failed:`, error);
        return "failed";
    }
}

async function runStep(step: SetupStep): Promise<boolean> {
    let cameFromRetry = false;
    while (!abortSetup) {
        if (cameFromRetry) {
            // Keep warning state after manual retry to avoid white→yellow flash
            stepRetrying.value = true;
            text.value = t("lobby.components.misc.initialSetup.stepRetrying", { step: step.label });
        } else {
            text.value = step.label;
            stepRetrying.value = false;
        }
        startStallDetection(step);

        const firstResult = await attemptStep(step);
        stopStallDetection();
        if (firstResult === "done") return true;
        if (firstResult === "aborted") return false;

        // Auto-retry: attempt up to AUTO_RETRY_ATTEMPTS-1 more times with delay
        let succeeded = false;
        for (let attempt = 1; attempt < AUTO_RETRY_ATTEMPTS; attempt++) {
            if (abortSetup) return false;
            stepRetrying.value = true;
            text.value = t("lobby.components.misc.initialSetup.stepRetrying", { step: step.label });
            await delay(AUTO_RETRY_DELAY_MS);
            if (abortSetup) return false;

            startStallDetection(step);
            const retryResult = await attemptStep(step);
            stopStallDetection();
            if (retryResult === "done") {
                succeeded = true;
                break;
            }
            if (retryResult === "aborted") return false;
        }

        if (succeeded) {
            stepRetrying.value = false;
            return true;
        }

        // All auto-retries exhausted — show manual Retry/Skip
        stepRetrying.value = false;
        text.value = t("lobby.components.misc.initialSetup.stepFailed", { step: step.label });
        stepError.value = "failed";
        canSkipCurrentStep.value = step.canSkip();
        const action = await waitForUserAction();
        if (action === "skip") {
            return false;
        }
        cameFromRetry = true;
        // Manual retry loops back to top
    }
    return false;
}

onMounted(async () => {
    console.debug("Initial setup");
    const steps = buildSteps();
    for (let i = 0; i < steps.length; i++) {
        if (abortSetup) break;
        await runStep(steps[i]);
    }

    await initBattleStore();
    emit("complete");
});

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
    flex-direction: column;
    gap: 12px;
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
    height: 64px;
    align-items: center;
    justify-content: center;

    h2 {
        margin: 0;
    }
}

.play-offline-action {
    margin-top: 20px;
}
</style>
