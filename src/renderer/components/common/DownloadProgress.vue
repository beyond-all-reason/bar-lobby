<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Progress
        :class="{ pulse: isDownloading }"
        :percent="downloadPercent"
        v-if="isDownloading"
        :percentStr="downloadPercent"
        :height="height"
    ></Progress>
</template>

<script lang="ts" setup>
import { computed, watch } from "vue";
import { contentRefs, inFlightFor } from "@renderer/store/contents.store";
import { isInProgress } from "@main/content/content-state";
import Progress from "@renderer/components/common/Progress.vue";

interface Props {
    maps?: string[];
    height: number;
    games?: string[];
    engines?: string[];
}

const { maps = [], height = 100, games = [], engines = [] } = defineProps<Props>();

const emit = defineEmits<{
    statusChange: [value: boolean];
}>();

const transfers = computed(() => inFlightFor(contentRefs({ maps, games, engines })).filter(isInProgress));

const isDownloading = computed(() => transfers.value.length > 0);

watch(isDownloading, (value) => {
    emit("statusChange", value);
});

const downloadPercent = computed(() => {
    if (transfers.value.length === 0) {
        return 0;
    }

    return transfers.value.reduce((total, state) => total + state.progress, 0) / transfers.value.length;
});
</script>
