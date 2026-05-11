<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <PopOutPanel :open="modelValue">
        <Transition name="fade" mode="out-in">
            <div v-if="allDownloads.length" class="downloads">
                <TransitionGroup tag="div" name="downloads-list">
                    <div v-for="download in limitedList" :key="download.name" class="downloads__download">
                        <div class="downloads__info">
                            <div class="downloads__name">{{ download.name }}</div>
                            <div class="downloads__type">{{ download.type }}</div>
                        </div>
                        <div v-if="download.phase === 'extracting'" class="downloads__extracting">
                            <Loader :absolute-position="false" />
                            <span>{{ t("lobby.navbar.downloads.extracting") }}</span>
                        </div>
                        <template v-else>
                            <Progress
                                :percent="downloadPercent(download)"
                                :text="barText(download)"
                                :height="20"
                                themed
                                pulsating
                            />
                            <div class="downloads__detail">{{ detailText(download) }}</div>
                        </template>
                    </div>
                </TransitionGroup>
                <Transition tag="div" name="fade" mode="out-in">
                    <div class="flex-row flex-grow flex-center" v-if="allDownloads.length > limitedList.length">
                        {{ t("lobby.navbar.downloads.moreDownloads", { count: allDownloads.length - limitedList.length }) }}
                    </div>
                </Transition>
            </div>
            <div v-else class="flex-row flex-grow flex-center">{{ t("lobby.navbar.downloads.noDownloads") }}</div>
        </Transition>
    </PopOutPanel>
</template>

<script lang="ts" setup>
import { computed, inject, Ref } from "vue";

import Loader from "@renderer/components/common/Loader.vue";
import Progress from "@renderer/components/common/Progress.vue";
import PopOutPanel from "@renderer/components/navbar/PopOutPanel.vue";
import { downloadsStore } from "@renderer/store/downloads.store";
import { useTypedI18n } from "@renderer/i18n";
import type { DownloadInfo } from "@main/content/downloads";

const { t } = useTypedI18n();

const props = defineProps<{
    modelValue: boolean;
}>();

const emits = defineEmits<{
    (e: "update:modelValue", open: boolean): void;
    (e: "percentChange", newPercent: number): void;
}>();

const toggleMessages = inject<Ref<(open?: boolean, userId?: number) => void>>("toggleMessages")!;
const toggleFriends = inject<Ref<(open?: boolean) => void>>("toggleFriends")!;
const toggleDownloads = inject<Ref<(open?: boolean) => void>>("toggleDownloads")!;

const allDownloads = computed(() => [
    ...downloadsStore.mapDownloads,
    ...downloadsStore.engineDownloads,
    ...downloadsStore.gameDownloads,
    ...downloadsStore.updateDownloads,
]);

const limitedList = computed(() => allDownloads.value.slice(0, 5));

toggleDownloads.value = async (open?: boolean) => {
    if (open) {
        toggleMessages.value(false);
        toggleFriends.value(false);
    }
    emits("update:modelValue", open ?? !props.modelValue);
};

interface SpeedEntry {
    prevBytes: number;
    prevTime: number;
    speed: number;
}
const speedTracker = new Map<string, SpeedEntry>();

function downloadPercent(download: DownloadInfo): number {
    if (download.totalBytes <= 0) return 0;
    return download.currentBytes / download.totalBytes;
}

function barText(download: DownloadInfo): string {
    if (download.currentBytes === 0) return t("lobby.navbar.downloads.starting");
    return `${(downloadPercent(download) * 100).toFixed(1)}%`;
}

function detailText(download: DownloadInfo): string {
    if (download.currentBytes === 0) return "";
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
    let text = `${cur} / ${tot} MB`;
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
</script>

<style lang="scss" scoped>
.downloads {
    display: flex;
    flex-direction: column;
    &__info {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }
    &__download {
        height: 85px;
        width: 100%;
        display: flex;
        flex-direction: column;
        padding: 12px 15px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.03);
        gap: 5px;
    }
    &__type {
        text-transform: uppercase;
        font-size: 12px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.7);
    }
    &__detail {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
    }
    &__extracting {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
        flex: 1;
    }
}

// Transition
.downloads-list-move {
    transition: all 0.2s ease;
    transition-delay: 0.2s;
}
.downloads-list-enter-active,
.downloads-list-leave-active {
    transition: all 0.2s ease;
}
.downloads-list-enter-from,
.downloads-list-leave-to {
    transform: translate(100%, 0);
}
.downloads-list-leave-active {
    position: absolute;
}
</style>
