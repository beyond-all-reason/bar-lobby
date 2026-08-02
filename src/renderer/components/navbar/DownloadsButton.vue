<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Button
        class="icon download-button"
        :style="`--downloadPercent: ${totalDownloadBytes.current < MIN_DOWNLOAD_BYTES ? 0 : (totalDownloadBytes.current / totalDownloadBytes.total) * 100}%`"
        :class="{ pulse: isDownloading }"
    >
        <Icon :icon="download" :height="40" />
        <span v-if="mapDownloadCount > 0" class="download-button__badge">{{ mapDownloadCount }}</span>
    </Button>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import download from "@iconify-icons/mdi/download";
import { computed } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import { MIN_DOWNLOAD_BYTES, useDownloadProgress } from "@renderer/composables/useDownloadProgress";
import { downloadsStore } from "@renderer/store/downloads.store";

const { allDownloads, totalDownloadBytes } = useDownloadProgress();
const isDownloading = computed(() => allDownloads.value.length > 0);
const mapDownloadCount = computed(() => downloadsStore.mapDownloadQueue.length);
</script>

<style lang="scss" scoped>
.download-button {
    position: relative;
    &__badge {
        position: absolute;
        top: 1px;
        right: 1px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #e85d04;
        color: white;
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
    }

    &:before {
        @extend .fullsize;
        width: calc(100% - 2px);
        top: 0;
        left: 1px;
        z-index: -1;
        background:
            radial-gradient(ellipse at top, hsla(69, 100%, 50%, 0.685), transparent),
            radial-gradient(ellipse at bottom, #2c4e0547, transparent);
        background-repeat: no-repeat;
        background-position: 0 100%;
        background-size: 100% var(--downloadPercent);
        transform: scale(105%);
        transition: background-size 300ms cubic-bezier(0.23, 0.29, 0.04, 1);
    }
    &:hover:before {
        background:
            radial-gradient(ellipse at top, hsla(69, 100%, 50%, 0.884), transparent),
            radial-gradient(ellipse at bottom, #4b830a, transparent);
        background-size: 100% var(--downloadPercent);
        background-repeat: no-repeat;
        background-position: 0 100%;
    }
    &.pulse:before {
        animation: pulse 1s infinite;
    }
}

@keyframes pulse {
    0% {
        background-color: rgba(255, 255, 255, 0);
    }
    50% {
        background-color: rgba(255, 255, 255, 0.03);
    }
    100% {
        background-color: rgba(255, 255, 255, 0);
    }
}
</style>
