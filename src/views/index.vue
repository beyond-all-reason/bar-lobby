<template>
    <div></div>
</template>

<script lang="ts" setup>
import { api } from "@/api/api";
import { playRandomMusic } from "@/utils/play-random-music";
import { useRouter } from "vue-router";

const router = useRouter();

if (api.settings.model.skipIntro.value) {
    playRandomMusic();
    router.replace("/preloader");
} else {
    router.replace("/intro");
}
</script>