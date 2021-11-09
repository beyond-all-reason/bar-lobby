<template>
    <div class="fullsize">
        <video @loadstart="play" @ended="skipIntro" @click="skipIntro">
            <source src="intro.mp4" type="video/mp4">
        </video>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    layout: {
        name: "empty",
        props: {
            transition: "intro-fade"
        }
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

            router.replace("/login");
        }

        return { skipIntro, play };
    }
});
</script>

<style scoped lang="scss">
video {
    object-fit: contain;
    width: 100%;
    height: 100%;
}
</style>