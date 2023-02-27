<template>
    <PopOutPanel :open="modelValue">
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
                <Progress
                    :percent="download.currentBytes / download.totalBytes"
                    :text="progressText(download.currentBytes, download.totalBytes)"
                    themed
                />
            </div>
        </div>
        <div v-else class="flex-row flex-grow flex-center">No downloads active</div>
    </PopOutPanel>
</template>

<script lang="ts" setup>
import { computed, inject, Ref } from "vue";

import Progress from "@/components/common/Progress.vue";
import PopOutPanel from "@/components/navbar/PopOutPanel.vue";

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

toggleDownloads.value = async (open?: boolean) => {
    if (open) {
        toggleMessages.value(false);
        toggleFriends.value(false);
    }

    emits("update:modelValue", open ?? !props.modelValue);
};

const downloads = computed(() =>
    api.content.engine.currentDownloads.concat(api.content.game.currentDownloads, api.content.maps.currentDownloads)
);

function progressText(currentBytes: number, totalBytes: number) {
    const percent = currentBytes / totalBytes;
    const currentMB = currentBytes / Math.pow(1024, 2);
    const totalMB = totalBytes / Math.pow(1024, 2);

    return `${currentMB.toFixed(2)}MB/${totalMB.toFixed(2)}MB (${(percent * 100).toFixed(2)}%)`;
}
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
