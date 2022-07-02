<template>
    <Button class="icon download-button" :style="`--downloadPercent: ${downloadPercent * 100}%`">
        <Icon :icon="download" :height="40" />
    </Button>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import download from "@iconify-icons/mdi/download";
import { computed } from "vue";

import Button from "@/components/inputs/Button.vue";

const downloadPercent = computed(() => {
    const downloads = api.content.engine.currentDownloads.concat(api.content.game.currentDownloads, api.content.maps.currentDownloads);

    let currentBytes = 0;
    let totalBytes = 0;

    for (const download of downloads) {
        currentBytes += download.currentBytes;
        totalBytes += download.totalBytes;
    }

    return currentBytes / totalBytes || 0;
});
</script>

<style lang="scss" scoped>
.download-button {
    position: relative;
    &:before {
        @extend .fullsize;
        z-index: -1;
        background: radial-gradient(ellipse at top, hsla(69, 100%, 50%, 0.685), transparent), radial-gradient(ellipse at bottom, #2c4e05c7, transparent);
        background-repeat: no-repeat;
        background-position: 0 100%;
        background-size: 100% var(--downloadPercent);
        transform: scale(105%);
    }
    &:hover:before {
        background: radial-gradient(ellipse at top, hsla(69, 100%, 50%, 0.884), transparent), radial-gradient(ellipse at bottom, #4b830a, transparent);
        background-size: 100% var(--downloadPercent);
        background-repeat: no-repeat;
        background-position: 0 100%;
    }
}
</style>
