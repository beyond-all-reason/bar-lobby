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
