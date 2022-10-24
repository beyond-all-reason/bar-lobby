<template>
    <div class="intro fullsize">
        <video ref="videoEl" @loadstart="play" @durationchange="onDurationChange" @click="end">
            <source v-if="videoSrc" :src="videoSrc" type="video/mp4" />
        </video>
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "jaz-ts-utils";
import { onMounted, Ref, ref } from "vue";

const videoEl: Ref<HTMLVideoElement | null> = ref(null);

const emit = defineEmits(["complete"]);

const videoSrc = ref("");

onMounted(async () => {
    const videoPaths: string[] = [];
    const videoModules = import.meta.glob("../../../assets/videos/**/*");
    for (const key in videoModules) {
        const videoModule = (await videoModules[key]()) as any;
        videoPaths.push(videoModule.default);
    }

    videoSrc.value = randomFromArray(videoPaths)!;
});

const play = () => {
    if (videoEl.value) {
        videoEl.value.volume = 0.2;
        videoEl.value.play();
    }
};

const onDurationChange = () => {
    if (videoEl.value) {
        const fadeOutDuration = 1000;
        window.setTimeout(() => {
            emit("complete");
        }, videoEl.value.duration * 1000 - fadeOutDuration);
    }
};

const end = () => {
    emit("complete");
};
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
