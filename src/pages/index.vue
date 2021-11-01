<template>
    <div :class="`container ${isLoaded ? 'fade-in' : ''}`" @click="skipVideo">
        <video @loadstart="play" @ended="skipVideo">
            <source src="local-video://intro.mp4" type="video/mp4">
        </video>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    layout: "empty",
    setup() {
        const isLoaded = ref(false);
        const router = useRouter();
        
        async function play({ target: video }: { target: HTMLVideoElement}) {
            video.volume = 0.2;
            video.play();
            isLoaded.value = true;
        }

        function skipVideo({ target: video }: { target: HTMLVideoElement}) {
            video.pause();
            router.replace("login");
        }

        return { skipVideo, play, isLoaded };
    }
});
</script>

<style scoped lang="scss">
.container {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 4s;
    height: 100%;
    &.fade-in {
        opacity: 1;
    }
}
</style>