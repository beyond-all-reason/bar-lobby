<template>
    <Button class="icon downloads-button" @click="downloadsModal" :style="`--downloadPercent: ${downloadPercent * 100}%`">
        <Icon icon="download" :size="40" />
    </Button>
</template>

<script lang="ts" setup>
import Icon from "@/components/common/Icon.vue";
import Button from "@/components/inputs/Button.vue";
import { computed } from "vue";

const downloadsModal = () => window.api.modals.open("downloads");

const downloadPercent = computed(() => {
    const downloads = window.api.content.engine.currentDownloads.concat(window.api.content.game.currentDownloads, window.api.content.maps.currentDownloads);

    let currentBytes = 0;
    let totalBytes = 0;

    for (const download of downloads) {
        currentBytes += download.currentBytes;
        totalBytes += download.totalBytes;
    }

    return (currentBytes / totalBytes) || 0;
});
</script>