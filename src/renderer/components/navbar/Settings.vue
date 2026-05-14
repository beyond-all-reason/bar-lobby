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

            <div>{{ t("lobby.navbar.settings.assetsPath") }}</div>
            <div class="path-row">
                <Textbox :model-value="currentAssetsPath" readonly class="path-input" />
                <Button class="slim" :disabled="isBusy" @click="browseForNewAssetsPath">{{ t("lobby.navbar.settings.browse") }}</Button>
            </div>

            <template v-if="pendingAssetsPath && pendingAssetsPath !== currentAssetsPath">
                <div></div>
                <div class="pending-section">
                    <Textbox :model-value="pendingAssetsPath" readonly class="path-input" />
                    <div v-if="isTransferring" class="copy-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" :style="{ width: copyProgressPercent + '%' }"></div>
                        </div>
                        <small>{{ t("lobby.navbar.settings.transferringFiles") }} {{ copyProgressPercent }}%</small>
                    </div>
                    <div v-else class="change-mode-section">
                        <label class="radio-option" :class="{ selected: changeMode === 'move' }">
                            <input v-model="changeMode" type="radio" value="move" name="changeMode" />
                            <div>
                                <span>{{ t("lobby.navbar.settings.moveToNewLocation") }}</span>
                                <small>{{ t("lobby.navbar.settings.moveToNewLocationDesc") }}</small>
                            </div>
                        </label>
                        <label class="radio-option" :class="{ selected: changeMode === 'copy' }">
                            <input v-model="changeMode" type="radio" value="copy" name="changeMode" />
                            <div>
                                <span>{{ t("lobby.navbar.settings.copyToNewLocation") }}</span>
                                <small>{{ t("lobby.navbar.settings.copyToNewLocationDesc") }}</small>
                            </div>
                        </label>
                        <label class="radio-option" :class="{ selected: changeMode === 'change-only' }">
                            <input v-model="changeMode" type="radio" value="change-only" name="changeMode" />
                            <div>
                                <span>{{ t("lobby.navbar.settings.useNewLocationOnly") }}</span>
                                <small>{{ t("lobby.navbar.settings.useNewLocationOnlyDesc") }}</small>
                            </div>
                        </label>
                        <small v-if="pathError" class="path-error">{{ pathError }}</small>
                        <Button class="green slim" :disabled="isBusy" @click="applyPathChange">{{
                            t("lobby.navbar.settings.apply")
                        }}</Button>
                    </div>
                </div>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import OverlayPanel from "primevue/overlaypanel";
import { asyncComputed } from "@vueuse/core";
import { settingsStore } from "@renderer/store/settings.store";
import { infosStore } from "@renderer/store/infos.store";
import { uploadLogs } from "@renderer/utils/log";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const currentAssetsPath = ref("");
const pendingAssetsPath = ref<string | null>(null);
const changeMode = ref<"move" | "copy" | "change-only">("move");
const isTransferring = ref(false);
const isChanging = ref(false);
const copyProgress = ref({ copied: 0, total: 0 });
const copyProgressPercent = computed(() => {
    if (copyProgress.value.total === 0) return 0;
    return Math.round((copyProgress.value.copied / copyProgress.value.total) * 100);
});
const pathError = ref("");
const isBusy = computed(() => isTransferring.value || isChanging.value);

let cleanupCopyProgress: (() => void) | undefined;

onMounted(async () => {
    currentAssetsPath.value = await window.paths.getCurrentAssetsPath();
    cleanupCopyProgress = window.paths.onCopyProgress((progress) => {
        copyProgress.value = progress;
    });
});

onUnmounted(() => {
    cleanupCopyProgress?.();
});

async function browseForNewAssetsPath() {
    const chosen = await window.paths.selectFolder();
    if (chosen) {
        pendingAssetsPath.value = chosen;
    }
}

async function applyPathChange() {
    if (!pendingAssetsPath.value) return;
    pathError.value = "";
    try {
        if (changeMode.value === "change-only") {
            isChanging.value = true;
            await window.paths.changePath(pendingAssetsPath.value);
        } else {
            isTransferring.value = true;
            copyProgress.value = { copied: 0, total: 0 };
            if (changeMode.value === "move") {
                await window.paths.moveAndChangePath(pendingAssetsPath.value);
            } else {
                await window.paths.copyAndChangePath(pendingAssetsPath.value);
            }
        }
        location.reload();
    } catch (err) {
        pathError.value = err instanceof Error ? err.message : String(err);
    } finally {
        isTransferring.value = false;
        isChanging.value = false;
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

    .path-input {
        flex: 1;
        min-width: 0;
    }
}

.pending-section {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .path-input {
        width: 100%;
    }
}

.change-mode-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.path-error {
    color: #ff6b6b;
    font-size: 11px;
}

.radio-option {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover {
        border-color: rgba(255, 255, 255, 0.25);
    }

    &.selected {
        border-color: rgba(100, 200, 100, 0.6);
    }

    input[type="radio"] {
        margin-top: 3px;
        accent-color: rgba(100, 200, 100, 0.8);
    }

    div {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    span {
        font-size: 12px;
    }

    small {
        opacity: 0.5;
        font-size: 10px;
    }
}

.copy-progress {
    display: flex;
    flex-direction: column;
    gap: 4px;

    small {
        opacity: 0.7;
        font-size: 11px;
    }
}

.progress-bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: rgba(100, 200, 100, 0.8);
    border-radius: 3px;
    transition: width 0.2s ease;
}
</style>
