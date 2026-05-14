<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.navbar.settings.title')">
        <div class="gridform">
            <div>{{ t("lobby.navbar.settings.fullscreen") }}</div>
            <Checkbox v-model="settingsStore.fullscreen" />

            <div>{{ t("lobby.navbar.settings.windowSize") }}</div>
            <Select
                v-model="settingsStore.size"
                :options="sizeOptions"
                optionLabel="label"
                optionValue="value"
                :disabled="settingsStore.fullscreen"
            />

            <div>{{ t("lobby.navbar.settings.display") }}</div>
            <Select v-model="settingsStore.displayIndex" :options="displayOptions" optionLabel="label" optionValue="value" />

            <div>{{ t("lobby.navbar.settings.skipIntro") }}</div>
            <Checkbox v-model="settingsStore.skipIntro" />

            <template v-if="settingsStore.devMode">
                <div>{{ t("lobby.navbar.settings.loginAutomatically") }}</div>
                <Checkbox v-model="settingsStore.loginAutomatically" />
            </template>

            <div>{{ t("lobby.navbar.settings.sfxVolume") }}</div>
            <Range v-model="settingsStore.sfxVolume" :min="0" :max="100" :step="1" />

            <div>{{ t("lobby.navbar.settings.musicVolume") }}</div>
            <Range v-model="settingsStore.musicVolume" :min="0" :max="100" :step="1" />

            <div>{{ t("lobby.navbar.settings.devMode") }}</div>
            <Checkbox v-model="settingsStore.devMode" />

            <OverlayPanel ref="op">
                <div class="container">
                    {{ tooltipMessage }}
                </div>
            </OverlayPanel>
            <Button @click="uploadLogsCommand">{{ t("lobby.navbar.settings.uploadLogs") }}</Button>

            <div class="section-header">{{ t("lobby.navbar.settings.storage") }}</div>
            <div></div>

            <div>{{ t("lobby.navbar.settings.assetsPath") }}</div>
            <div class="path-row">
                <span class="path-text">{{ currentAssetsPath }}</span>
                <Button class="slim" @click="browseForNewAssetsPath">{{ t("lobby.navbar.settings.browse") }}</Button>
            </div>

            <template v-if="pendingAssetsPath && pendingAssetsPath !== currentAssetsPath">
                <div></div>
                <div class="pending-path">
                    <span class="path-text dimmed">{{ pendingAssetsPath }}</span>
                    <div class="restart-actions">
                        <small>{{ t("lobby.navbar.settings.restartRequired") }}</small>
                        <Button class="green slim" @click="changeAndCopy">{{ t("lobby.navbar.settings.changeAndCopy") }}</Button>
                        <Button class="slim" @click="changeWithoutCopy">{{ t("lobby.navbar.settings.changeWithoutCopy") }}</Button>
                    </div>
                </div>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import Button from "@renderer/components/controls/Button.vue";
import OverlayPanel from "primevue/overlaypanel";
import { asyncComputed } from "@vueuse/core";
import { settingsStore } from "@renderer/store/settings.store";
import { infosStore } from "@renderer/store/infos.store";
import { uploadLogs } from "@renderer/utils/log";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const currentAssetsPath = ref("");
const pendingAssetsPath = ref<string | null>(null);

onMounted(async () => {
    currentAssetsPath.value = await window.paths.getCurrentAssetsPath();
});

async function browseForNewAssetsPath() {
    const chosen = await window.paths.selectFolder();
    if (chosen) {
        pendingAssetsPath.value = chosen;
    }
}

async function changeAndCopy() {
    if (pendingAssetsPath.value) {
        await window.paths.moveAndRestart(pendingAssetsPath.value);
    }
}

async function changeWithoutCopy() {
    if (pendingAssetsPath.value) {
        await window.paths.changeAndRestart(pendingAssetsPath.value);
    }
}

const op = ref();
const tooltipMessage = ref("");

const sizeOptions = [
    { label: t("lobby.navbar.settings.labelLg"), value: 900 },
    { label: t("lobby.navbar.settings.labelMd"), value: 720 },
    { label: t("lobby.navbar.settings.labelSm"), value: 540 },
];

const displayOptions = asyncComputed(async () => {
    return Array(infosStore.hardware.numOfDisplays)
        .fill(0)
        .map((_, i) => {
            return { label: t("lobby.navbar.settings.labelDisplay", { id: i + 1 }), value: i };
        });
});

async function uploadLogsCommand(event) {
    // Store off event and target to avoid async issue
    const curE = event;
    const curTarget = curE.currentTarget;

    // Do the operations
    try {
        const url = await uploadLogs();
        await navigator.clipboard.writeText(url);
        tooltipMessage.value = t("lobby.navbar.settings.logUrlCopied");
    } catch (e) {
        if (typeof e === "string") {
            tooltipMessage.value = e;
        } else {
            tooltipMessage.value = t("lobby.navbar.settings.couldNotUploadLog");
        }
    }

    // Display feedback
    op.value.show(curE, curTarget);
}
</script>

<style lang="scss" scoped>
.container {
    background-color: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(5px);
}

.section-header {
    grid-column: 1 / -1;
    margin-top: 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.5;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    padding-bottom: 4px;
}

.path-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.path-text {
    font-size: 12px;
    opacity: 0.85;
    word-break: break-all;

    &.dimmed {
        opacity: 0.55;
    }
}

.pending-path {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.restart-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;

    small {
        opacity: 0.6;
        font-size: 11px;
    }
}
</style>
