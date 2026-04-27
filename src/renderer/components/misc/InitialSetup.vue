<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="initial-setup fullsize flex-center">
        <h1>{{ t("lobby.components.misc.initialSetup.title") }}</h1>
        <h4>{{ text }}</h4>
        <h2 v-if="downloadPercent < 1 && !stepError">{{ (downloadPercent * 100).toFixed(0) }}%</h2>
        <div v-if="stepError" class="step-error">
            <p class="error-message">{{ stepError }}</p>
            <div class="step-actions">
                <Button class="green" @click="retryCurrentStep">{{ t("lobby.components.misc.initialSetup.retry") }}</Button>
                <Button v-if="canSkipCurrentStep" class="red" @click="skipCurrentStep">{{
                    t("lobby.components.misc.initialSetup.skip")
                }}</Button>
            </div>
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
import { onMounted, ref, watch } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import Button from "@renderer/components/controls/Button.vue";

const { t } = useTypedI18n();

const emit = defineEmits<{
    (event: "complete"): void;
}>();

const text = ref("");
const stepError = ref("");
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
            canSkip: () => gameStore.availableGameVersions.has(LATEST_GAME_VERSION),
            async action() {
                await window.game.preloadPoolData();
                await downloadGame(LATEST_GAME_VERSION);
            },
        },
        {
            label: t("lobby.components.misc.initialSetup.downloadingMaps"),
            canSkip: () => true,
            async action() {
                const installedMaps = await db.maps.filter((m) => m.isInstalled === true).count();
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

async function runStep(step: SetupStep): Promise<boolean> {
    while (!abortSetup) {
        text.value = step.label;
        try {
            const abortPromise = new Promise<void>((resolve) => {
                resolveAbort = resolve;
            });
            const result = await Promise.race([step.action().then(() => "done" as const), abortPromise.then(() => "aborted" as const)]);
            if (result === "aborted") return false;
            return true;
        } catch (error) {
            if (abortSetup) return false;
            console.error(`Setup step "${step.label}" failed:`, error);
            stepError.value = t("lobby.components.misc.initialSetup.stepFailed");
            canSkipCurrentStep.value = step.canSkip();
            const action = await waitForUserAction();
            if (action === "skip") {
                return false;
            }
            // retry loops back
        }
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

.step-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.error-message {
    color: rgb(239, 83, 80);
}

.step-actions {
    display: flex;
    gap: 12px;
}

.play-offline-action {
    margin-top: 20px;
}
</style>
