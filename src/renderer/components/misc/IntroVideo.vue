<template>
    <div class="intro fullsize">
        <video ref="videoEl" @click="end">
            <source :src="randomIntroVideo" type="video/mp4" />
        </video>
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "jaz-ts-utils";
import { onMounted, Ref, ref } from "vue";

const videoEl: Ref<HTMLVideoElement | null> = ref(null);

const emit = defineEmits(["complete"]);

const introVideos = import.meta.glob("@/assets/videos/intros/**/*", { query: "?url", import: "default" });
const randomIntroVideo = randomFromArray(Object.keys(introVideos))?.split("/assets/")[1];

onMounted(async () => {
    if (videoEl.value) {
        try {
            await videoEl.value.play();
            videoEl.value.volume = 0.2;

            const fadeOutDuration = 1000;
            window.setTimeout(() => {
                emit("complete");
            }, videoEl.value.duration * 1000 - fadeOutDuration);
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
