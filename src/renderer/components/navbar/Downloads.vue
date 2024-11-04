<template>
    <PopOutPanel :open="modelValue">
        <Transition name="fade" mode="out-in">
            <div v-if="downloadsStore.mapDownloads.length" class="downloads">
                <TransitionGroup tag="div" name="downloads-list">
                    <div v-for="(download, i) in limitedList" :key="i" class="downloads__download">
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
                            pulsating
                        />
                    </div>
                </TransitionGroup>
                <Transition tag="div" name="fade" mode="out-in">
                    <div class="flex-row flex-grow flex-center" v-if="downloadsStore.mapDownloads.length > limitedList.length">
                        {{ `and ${downloadsStore.mapDownloads.length - limitedList.length} more...` }}
                    </div>
                </Transition>
            </div>
            <div v-else class="flex-row flex-grow flex-center">No downloads active</div>
        </Transition>
    </PopOutPanel>
</template>

<script lang="ts" setup>
import { computed, inject, Ref } from "vue";

import Progress from "@renderer/components/common/Progress.vue";
import PopOutPanel from "@renderer/components/navbar/PopOutPanel.vue";
import { downloadsStore } from "@renderer/store/downloads.store";

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

const limitedList = computed(() => downloadsStore.mapDownloads.slice(0, 5));

toggleDownloads.value = async (open?: boolean) => {
    if (open) {
        toggleMessages.value(false);
        toggleFriends.value(false);
    }

    emits("update:modelValue", open ?? !props.modelValue);
};

function progressText(currentBytes: number, totalBytes: number): string {
    if (currentBytes === 0) {
        return "Starting...";
    }
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
    &__info {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }
    &__download {
        height: 75px; // fixed size for the animations to work well
        width: 100%; // fixed size for the animations to work well
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

// Transition
.downloads-list-move {
    transition: all 0.2s ease;
    transition-delay: 0.2s;
}
.downloads-list-enter-active,
.downloads-list-leave-active {
    transition: all 0.2s ease;
}
.downloads-list-enter-from,
.downloads-list-leave-to {
    transform: translate(100%, 0);
}
.downloads-list-leave-active {
    position: absolute;
}
</style>
