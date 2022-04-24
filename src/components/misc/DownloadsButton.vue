<template>
    <Button class="icon downloads-button" :style="`--downloadPercent: ${downloadPercent * 100}%`" @click="downloadsModal">
        <Icon icon="download" :size="40" />
    </Button>
</template>

<script lang="ts" setup>
import Icon from "@/components/common/Icon.vue";
import Button from "@/components/inputs/Button.vue";
import { computed } from "vue";

const downloadsModal = () => api.modals.open("downloads");

const downloadPercent = computed(() => {
    const downloads = api.content.engine.currentDownloads.concat(api.content.game.currentDownloads, api.content.maps.currentDownloads);

    let currentBytes = 0;
    let totalBytes = 0;

    for (const download of downloads) {
        currentBytes += download.currentBytes;
        totalBytes += download.totalBytes;
    }

    return (currentBytes / totalBytes) || 0;
});
</script>