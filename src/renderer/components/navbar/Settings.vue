<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal
        :modelValue="modelValue"
        :title="t('lobby.navbar.settings.title')"
        @update:modelValue="(open: boolean) => emit('update:modelValue', open)"
    >
        <div class="gridform">
            <div class="section-header">{{ t("lobby.navbar.settings.sectionDisplay") }}</div>

            <div>{{ t("lobby.navbar.settings.resolution") }}</div>
            <Select v-model="displayMode" :options="resolutionOptions" optionLabel="label" optionValue="value" />

            <div>{{ t("lobby.navbar.settings.display") }}</div>
            <Select v-model="selectedDisplay" :options="displayOptions" optionLabel="label" optionValue="value" />

            <div>{{ t("lobby.navbar.settings.uiScale") }}</div>
            <!-- Wrapped so the cell, not the slider, takes gridform's positional rule for
            the label column. See #716. -->
            <div>
                <Range
                    :modelValue="shownScalePercent"
                    commitOnRelease
                    :min="UI_SCALE_MIN * 100"
                    :max="UI_SCALE_MAX * 100"
                    :step="UI_SCALE_STEP * 100"
                    @preview="(value: number | number[]) => (draggedScalePercent = value as number)"
                    @update:modelValue="commitScalePercent"
                />
            </div>

            <div class="section-header">{{ t("lobby.navbar.settings.sectionSound") }}</div>

            <div>{{ t("lobby.navbar.settings.sfxVolume") }}</div>
            <Range v-model="settingsStore.sfxVolume" :min="0" :max="100" :step="1" />

            <div>{{ t("lobby.navbar.settings.musicVolume") }}</div>
            <Range v-model="settingsStore.musicVolume" :min="0" :max="100" :step="1" />

            <div class="section-header">{{ t("lobby.navbar.settings.sectionGeneral") }}</div>

            <div>
                <span>
                    <Icon :icon="language" />
                    {{ t("lobby.navbar.settings.language") }}
                </span>
            </div>
            <Select v-model="settingsStore.language" :options="localeOptions" optionLabel="label" optionValue="value" />

            <div>{{ t("lobby.navbar.settings.skipIntro") }}</div>
            <Checkbox v-model="settingsStore.skipIntro" />

            <template v-if="settingsStore.devMode">
                <div>{{ t("lobby.navbar.settings.loginAutomatically") }}</div>
                <Checkbox v-model="settingsStore.loginAutomatically" />
            </template>

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
                        <small>{{ t("lobby.navbar.settings.transferringFiles", { percent: copyProgressPercent }) }}</small>
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
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import Modal from "@renderer/components/common/Modal.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import Button from "@renderer/components/controls/Button.vue";
import Textbox from "@renderer/components/controls/Textbox.vue";
import OverlayPanel from "primevue/overlaypanel";
import { asyncComputed } from "@vueuse/core";
import { settingsStore } from "@renderer/store/settings.store";
import {
    MIN_WINDOW_SIZE,
    SUPPORTED_ASPECT_RATIOS,
    UI_SCALE_MAX,
    UI_SCALE_MIN,
    UI_SCALE_STEP,
    WINDOW_HEIGHT_STEPS,
} from "@main/config/window";
import { contentsStore } from "@renderer/store/contents.store";
import { isUnsettled } from "@main/content/content-state";
import { refreshEnginesStore } from "@renderer/store/engine.store";
import { refreshGameStore } from "@renderer/store/game.store";
import { refreshMapsStore } from "@renderer/store/maps.store";
import { uploadLogs } from "@renderer/utils/log";
import { useTypedI18n } from "@renderer/i18n";
import language from "@iconify-icons/mdi/language";
import { Icon } from "@iconify/vue";
import { useLocaleOptions } from "@renderer/composables/useLocaleOptions";
import type { Locale } from "@renderer/locales";
const { t, locale } = useTypedI18n();
const { localeOptions } = useLocaleOptions();

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
const hasActiveDownloads = computed(() => contentsStore.inFlight.some(isUnsettled));
const isBusy = computed(() => isTransferring.value || isChanging.value || hasActiveDownloads.value);

let cleanupCopyProgress: (() => void) | undefined;

// Declared rather than left to fall through: the confirmation modal makes this a second
// root, and Vue only inherits attributes onto a single one.
const props = defineProps<{ modelValue?: boolean }>();
const emit = defineEmits<{ (event: "update:modelValue", open: boolean): void }>();

watch(
    () => props.modelValue,
    async (isOpen) => {
        if (isOpen) {
            currentAssetsPath.value = await window.paths.getCurrentAssetsPath();
        }
    }
);

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
    contentsStore.isPathChanging = true;
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
        await Promise.all([refreshEnginesStore(), refreshGameStore(), refreshMapsStore()]);
        currentAssetsPath.value = await window.paths.getCurrentAssetsPath();
        pendingAssetsPath.value = null;
    } catch (err) {
        pathError.value = err instanceof Error ? err.message : String(err);
    } finally {
        isTransferring.value = false;
        isChanging.value = false;
        contentsStore.isPathChanging = false;
    }
}

const op = ref();
const tooltipMessage = ref("");

const displays = asyncComputed(() => window.mainWindow.getDisplays(), []);

const targetDisplay = computed(() => displays.value.find((d) => d.index === settingsStore.displayIndex) ?? displays.value[0]);

const sizeKey = (width: number, height: number) => `${width}x${height}`;

// Only the monitor's own shape is offered. Snapped to the nearest supported ratio so the
// labels stay meaningful on unusual displays.
const displayRatio = computed(() => {
    const display = targetDisplay.value;
    if (!display) return SUPPORTED_ASPECT_RATIOS[0];

    const actual = display.size.width / display.size.height;

    return SUPPORTED_ASPECT_RATIOS.reduce((closest, candidate) =>
        Math.abs(candidate.ratio - actual) < Math.abs(closest.ratio - actual) ? candidate : closest
    );
});

const resolutionOptions = computed(() => {
    const fullscreen = { label: t("lobby.navbar.settings.fullscreenOption"), value: "fullscreen" as const };
    const maximized = { label: t("lobby.navbar.settings.maximizedOption"), value: "maximized" as const };
    const display = targetDisplay.value;
    if (!display) return [fullscreen, maximized];

    const { label: ratioLabel, ratio } = displayRatio.value;
    const windowed = WINDOW_HEIGHT_STEPS.map((height) => ({ width: Math.round((height * ratio) / 2) * 2, height }))
        .filter(
            ({ width, height }) =>
                width >= MIN_WINDOW_SIZE.width &&
                height >= MIN_WINDOW_SIZE.height &&
                width <= display.workArea.width &&
                height <= display.workArea.height
        )
        .map(({ width, height }) => ({ label: `${width} x ${height} (${ratioLabel})`, value: sizeKey(width, height) }));

    // The window can be dragged to any size, so its current one may be none of these.
    const stored = sizeKey(settingsStore.windowWidth, settingsStore.windowHeight);
    if (!settingsStore.fullscreen && !settingsStore.maximized && !windowed.some((option) => option.value === stored)) {
        windowed.unshift({ label: `${settingsStore.windowWidth} x ${settingsStore.windowHeight}`, value: stored });
    }

    return [fullscreen, maximized, ...windowed];
});

const displayMode = computed<string>({
    get: () => {
        if (settingsStore.fullscreen) return "fullscreen";
        if (settingsStore.maximized) return "maximized";

        return sizeKey(settingsStore.windowWidth, settingsStore.windowHeight);
    },
    set: (value) => {
        settingsStore.fullscreen = value === "fullscreen";
        settingsStore.maximized = value === "maximized";
        if (value === "fullscreen" || value === "maximized") return;

        const [width, height] = value.split("x").map(Number);
        settingsStore.windowWidth = width;
        settingsStore.windowHeight = height;
    },
});

const selectedDisplay = computed<number>({
    get: () => settingsStore.displayIndex,
    set: (index) => (settingsStore.displayIndex = index),
});

const scaleRange = ref({ min: 1, max: 1, os: 1 });

onMounted(async () => {
    scaleRange.value = await window.mainWindow.getScaleRange();
    // The achievable range moves with the window, so the control has to follow it.
    window.mainWindow.onScaleRangeChanged((range) => (scaleRange.value = range));
});

// Null means the user has never set one, and the OS scale is what to start them at.
const uiScalePercent = computed(() => Math.round((settingsStore.uiScale ?? scaleRange.value.os) * 100));

const draggedScalePercent = ref<number | null>(null);
const shownScalePercent = computed(() => draggedScalePercent.value ?? uiScalePercent.value);

function commitScalePercent(value: number | number[]) {
    const percent = Math.round(value as number);

    draggedScalePercent.value = null;
    // Against what the slider showed, not the stored value, which is null until first set.
    if (percent === uiScalePercent.value) return;

    settingsStore.uiScale = percent / 100;
}

// Same source as the move and the size list, so a detached monitor cannot be offered.
const displayOptions = computed(() =>
    displays.value.map(({ index }) => ({ label: t("lobby.navbar.settings.labelDisplay", { id: index + 1 }), value: index }))
);

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

watch(
    () => settingsStore.language,
    () => {
        locale.value = settingsStore.language as Locale;
    }
);
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
