<template>
    <Modal name="downloads" width="500px" height="500px">
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
        <div v-else class="flex-row flex-grow flex-center">
            No downloads active
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import Modal from "@/components/common/Modal.vue";
import Progress from "@/components/common/Progress.vue";
import { computed } from "vue";

const emits = defineEmits<{
    (e: "percentChange", newPercent: number): void;
}>();

const downloads = computed(() => window.api.content.engine.currentDownloads.concat(window.api.content.game.currentDownloads, window.api.content.maps.currentDownloads));

const progressText = (currentBytes: number, totalBytes: number) => {
    const percent = currentBytes / totalBytes;
    const currentMB = currentBytes / Math.pow(1024, 2);
    const totalMB = totalBytes / Math.pow(1024, 2);

    return `${currentMB.toFixed(2)}MB/${totalMB.toFixed(2)}MB (${(percent * 100).toFixed(2)}%)`;
};
</script>