<template>
    <div class="intro fullsize">
        <video @loadstart="play" @ended="end" @click="end">
            <source :src="videoSrc" type="video/mp4" />
        </video>
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "jaz-ts-utils";

const emit = defineEmits(["complete"]);

const videoPaths: string[] = [];
for (const path of require.context("@/assets/videos/intros/", true).keys()) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const resolvedPath = require(`@/assets/videos/intros/${path.slice(2)}`);
    videoPaths.push(resolvedPath);
}

const videoSrc = randomFromArray(videoPaths)!;

const play = (event: Event) => {
    const videoEl = event.target as HTMLVideoElement;
    videoEl.volume = 0.2;
    videoEl.play();
};

const end = () => {
    emit("complete");
};
</script>

<style lang="scss" scoped>
.intro {
    background: #000;
}
video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
</style>
