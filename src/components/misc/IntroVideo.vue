<template>
    <div class="intro fullsize">
        <video ref="videoEl" @loadstart="play" @durationchange="onDurationChange" @click="end">
            <source :src="videoSrc" type="video/mp4" />
        </video>
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "jaz-ts-utils";
import { Ref, ref } from "vue";

const videoEl: Ref<HTMLVideoElement | null> = ref(null);

const emit = defineEmits(["complete"]);

const videoPaths: string[] = [];
for (const path of require.context("@/assets/videos/intros/", true).keys()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resolvedPath = require(`@/assets/videos/intros/${path.slice(2)}`);
    videoPaths.push(resolvedPath);
}

const videoSrc = randomFromArray(videoPaths)!;

const play = () => {
    if (videoEl.value) {
        videoEl.value.volume = 0.2;
        videoEl.value.play();
    }
};

const onDurationChange = () => {
    if (videoEl.value) {
        const fadeOutDuration = 1000;
        setTimeout(() => {
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
