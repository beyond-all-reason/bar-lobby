<template>
    <div></div>
</template>

<script lang="ts" setup>
import { playRandomMusic } from "@/utils/play-random-music";
import { useRouter } from "vue-router";

const router = useRouter();

if (window.api.settings.model.skipIntro.value) {
    playRandomMusic();
    router.replace("/preloader");
} else {
    router.replace("/intro");
}
</script>