<template>
    <div :class="`container ${isLoaded ? 'fade-in' : ''}`" @click="skipVideo"> -->
        <video src="@/assets/videos/intro.mp4" @play="onLoad" @ended="skipVideo"></video>
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

        function onLoad({ target: video }: { target: HTMLVideoElement}) {
            isLoaded.value = true;
        }

        function skipVideo({ target: video }: { target: HTMLVideoElement}) {
            video.pause();
            router.replace("login");
        }

        return { skipVideo, onLoad, isLoaded };
    }
});
</script>

<style scoped lang="scss">
.container {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 3s;
    height: 100%;
    &.fade-in {
        opacity: 1;
    }
}
</style>