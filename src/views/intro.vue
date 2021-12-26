<template>
    <div class="intro fullsize">
        <video @loadstart="play" @ended="skipIntro" @click="skipIntro">
            <source src="@/assets/videos/intro.mp4" type="video/mp4">
        </video>
    </div>
</template>

<script lang="ts">
import { playRandomMusic } from "@/utils/play-random-music";
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    layout: {
        name: "empty"
    },
    setup() {
        const router = useRouter();

        async function play({ target: video }: { target: HTMLVideoElement}) {
            video.volume = 0.2;
            video.play();
        }

        function skipIntro() {
            if (router.currentRoute.value.path !== "/intro") {
                return;
            }

            playRandomMusic();

            router.replace("/login");
        }

        return { skipIntro, play };
    }
});
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