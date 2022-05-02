<template>
    <div class="intro fullsize">
        <video @loadstart="play" @ended="end" @click="end">
            <source src="@/assets/videos/intro.mp4" type="video/mp4">
        </video>
    </div>
</template>

<script lang="ts" setup>
const emit = defineEmits(["complete"]);

const play = (event: Event) => {
    const video = event.target as HTMLVideoElement;
    video.volume = 0.2;
    video.play();
};

const end = () => {
    emit("complete");
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