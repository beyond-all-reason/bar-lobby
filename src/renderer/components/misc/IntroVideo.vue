<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="intro fullsize">
        <video ref="videoEl" @click="end">
            <source :src="randomIntroVideo" type="video/mp4" />
        </video>
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "$/jaz-ts-utils/object";
import { introVideos } from "@renderer/assets/assetFiles";
import { onMounted, Ref, ref } from "vue";

const videoEl: Ref<HTMLVideoElement | null> = ref(null);

const emit = defineEmits(["complete"]);

console.debug(`Loading ${Object.values(introVideos).length} intro videos...`);
const randomIntroVideo = randomFromArray(Object.values(introVideos));
console.debug("Setting intro video:", randomIntroVideo);

onMounted(async () => {
    if (videoEl.value) {
        try {
            await videoEl.value.play();
            videoEl.value.volume = 0.2;

            const fadeOutDuration = 1000;
            window.setTimeout(
                () => {
                    emit("complete");
                },
                videoEl.value.duration * 1000 - fadeOutDuration
            );
        } catch (err) {
            console.debug(err);
            end();
        }
    }
});

function end() {
    emit("complete");
}
</script>

<style lang="scss" scoped>
.intro {
    background: #000;
    z-index: 1000;
}
video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
</style>
