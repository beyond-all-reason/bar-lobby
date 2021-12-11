<template>
    <div :class="`fullsize theme theme--${theme}`">
        <Alert />
        <Settings />
        <DebugSidebar/>
        <router-view/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRouter } from "vue-router";
import { randomFromArray } from "jaz-ts-utils";

export default defineComponent({
    setup() {
        const theme = window.api.settings.model.theme;

        const allMusic = Array.from(window.api.audio.musicSounds.values());
        const playRandomMusic = () => {
            const music = randomFromArray(allMusic);
            music.on("end", () => {
                playRandomMusic();
                music.unload();
            });
            music.play();
        };

        playRandomMusic();

        const router = useRouter();
        router.replace("/");

        return { theme };
    }
});
</script>