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

const refs = computed(() => contentRefs({ maps, games, engines }));

const transfers = computed(() => inFlightFor(refs.value).filter(isInProgress));

const isDownloading = computed(() => transfers.value.length > 0);

watch(isDownloading, (value) => {
    emit("statusChange", value);
});

// Measured against everything asked for, not just what is still moving. Content leaves inFlight the
// moment it lands, so averaging over what is left starts again from nothing each time a batch finishes.
const downloadPercent = computed(() => {
    const total = refs.value.length;

    if (total === 0) {
        return 0;
    }

    const landed = total - transfers.value.length;

    return (landed + transfers.value.reduce((sum, state) => sum + state.progress, 0)) / total;
});
</script>
