<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <PopOutPanel :open="modelValue">
        <Transition name="fade" mode="out-in">
            <div v-if="hasDownloads" class="downloads">
                <TransitionGroup tag="div" name="downloads-list">
                    <div v-for="download in mapDownloadQueue" :key="download.springName" class="downloads__download">
                        <div class="downloads__info">
                            <div class="downloads__name">{{ download.springName }}</div>
                            <div class="downloads__status">
                                {{
                                    download.status === "downloading"
                                        ? t("lobby.navbar.downloads.downloading")
                                        : t("lobby.navbar.downloads.queued")
                                }}
                            </div>
                        </div>
                    </div>
                    <div v-for="download in nonMapDownloads" :key="`${download.type}:${download.name}`" class="downloads__download">
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
                                :percent="download.totalBytes < MIN_DOWNLOAD_BYTES ? 0 : downloadPercent(download)"
                                :text="barText(download)"
                                :height="20"
                                themed
                                pulsating
                            />
                            <div class="downloads__detail">{{ detailText(download) }}</div>
                        </template>
                    </div>
                </TransitionGroup>
            </div>
            <div v-else class="downloads__empty">{{ t("lobby.navbar.downloads.noDownloads") }}</div>
        </Transition>
    </PopOutPanel>
</template>

<script lang="ts" setup>
import { computed, inject, Ref } from "vue";

import type { DownloadInfo } from "@main/content/downloads";
import Loader from "@renderer/components/common/Loader.vue";
import Progress from "@renderer/components/common/Progress.vue";
import PopOutPanel from "@renderer/components/navbar/PopOutPanel.vue";
import { useTypedI18n } from "@renderer/i18n";
import { MIN_DOWNLOAD_BYTES, useDownloadProgress } from "@renderer/composables/useDownloadProgress";
import { downloadsStore } from "@renderer/store/downloads.store";

const { t } = useTypedI18n();
const { allDownloads, downloadPercent, progressText } = useDownloadProgress();

function barText(download: DownloadInfo): string {
    if (download.currentBytes === 0) return t("lobby.navbar.downloads.starting");
    return `${(downloadPercent(download) * 100).toFixed(1)}%`;
}

function detailText(download: DownloadInfo): string {
    if (download.currentBytes === 0) return "";
    return progressText(download);
}

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

const mapDownloadQueue = computed(() => downloadsStore.mapDownloadQueue);
const nonMapDownloads = computed(() => allDownloads.value.filter((download) => download.type !== "map"));
const hasDownloads = computed(() => mapDownloadQueue.value.length > 0 || nonMapDownloads.value.length > 0);

toggleDownloads.value = async (open?: boolean) => {
    if (open) {
        toggleMessages.value(false);
        toggleFriends.value(false);
    }
    emits("update:modelValue", open ?? !props.modelValue);
};
</script>

<style lang="scss" scoped>
.downloads {
    height: 400px;
    overflow-y: auto;

    &__info {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 15px;
    }

    &__download {
        min-height: 68px;
        width: 100%;
        display: flex;
        flex-direction: column;
        padding: 12px 15px;
        border: 1px solid rgba(255, 255, 255, 0.07);
        background: rgba(255, 255, 255, 0.03);
        gap: 5px;
    }

    &__name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__type,
    &__status {
        flex: none;
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

    &__empty {
        display: flex;
        min-height: 160px;
        align-items: center;
        justify-content: center;
    }
}

.downloads-list-move {
    transition: transform 0.2s ease;
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
