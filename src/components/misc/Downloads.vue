<template>
    <Modal title="Downloads" width="500px" height="500px">
        <div v-if="downloads.length" class="downloads">
            <div v-for="(download, i) in downloads" :key="i" class="downloads__download">
                <div class="downloads__info">
                    <div class="downloads__name">
                        {{ download.name }}
                    </div>
                    <div class="downloads__type">
                        {{ download.type }}
                    </div>
                </div>
                <Progress :percent="download.currentBytes / download.totalBytes" :text="progressText(download.currentBytes, download.totalBytes)" themed />
            </div>
        </div>
        <div v-else class="flex-row flex-grow flex-center">No downloads active</div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed } from "vue";

import Modal from "@/components/common/Modal.vue";
import Progress from "@/components/common/Progress.vue";

const emits = defineEmits<{
    (e: "percentChange", newPercent: number): void;
}>();

const downloads = computed(() => api.content.engine.currentDownloads.concat(api.content.game.currentDownloads, api.content.maps.currentDownloads));

const progressText = (currentBytes: number, totalBytes: number) => {
    const percent = currentBytes / totalBytes;
    const currentMB = currentBytes / Math.pow(1024, 2);
    const totalMB = totalBytes / Math.pow(1024, 2);

    return `${currentMB.toFixed(2)}MB/${totalMB.toFixed(2)}MB (${(percent * 100).toFixed(2)}%)`;
};
</script>

<style lang="scss" scoped>
.downloads {
    display: flex;
    flex-direction: column;
    gap: 10px;
    &-button {
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
    &__info {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }
    &__download {
        display: flex;
        flex-direction: column;
        padding: 15px;
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
}
</style>
