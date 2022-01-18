<template>
    <div class="intro fullsize">
        <video @loadstart="play" @ended="skipIntro" @click="skipIntro">
            <source src="@/assets/videos/intro.mp4" type="video/mp4">
        </video>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    layout: {
        name: "default",
        props: {
            empty: true
        }
    }
});
</script>

<script lang="ts" setup>
import { playRandomMusic } from "@/utils/play-random-music";
import { useRouter } from "vue-router";

const router = useRouter();

const play = (event: Event) => {
    const video = event.target as HTMLVideoElement;
    video.volume = 0.2;
    video.play();
};

const skipIntro = () => {
    if (router.currentRoute.value.path !== "/intro") {
        return;
    }

    playRandomMusic();

    router.replace("/preloader");
};
</script>

<style scoped lang="scss">
.intro {
    background: #000;
}
video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
</style>