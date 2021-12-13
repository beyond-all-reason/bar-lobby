<template>
    <div class="load">
        <img v-for="imgSrc in imgSrcs" :key="imgSrc" :src="imgSrc">
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import * as path from "path";
import { playRandomMusic } from "@/utils/play-random-music";

export default defineComponent({
    layout: "empty",
    setup() {
        const router = useRouter();
        const imgSrcs = ref([] as Array<string>);

        // TODO: replace this file with a proper preloader
        
        const imageFiles = require.context("@/assets/images/", true).keys();
        for (const imageFile of imageFiles) {
            const fileName = imageFile.slice(2);
            const buildImagePath = require(`@/assets/images/${fileName}`);
            imgSrcs.value.push(buildImagePath);
        }

        const fontFiles = require.context("@/assets/fonts/", true).keys();
        for (const fontFile of fontFiles) {
            const parts = fontFile.split("/");
            const family = parts[1];
            const fileName = parts[2];
            const [weight, style] = fileName.split(".")[0].split("-");
            
            const buildFontPath = require(`@/assets/fonts/${family}/${fileName}`);
            const font = new FontFace(family, `url(${buildFontPath})`, { weight, style });
            font.load().then(() => {
                document.fonts.add(font);
            });
        }

        const backgrounds = imageFiles.filter(path => path.includes("backgrounds"));
        const randomBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        const backgroundFile = path.parse(randomBackground).base;
        const outputImage = require(`@/assets/images/backgrounds/${backgroundFile}`);
        document.documentElement.style.setProperty("--background", `url(${outputImage})`);

        if (window.api.settings.model.skipIntro.value) {
            playRandomMusic();
            router.replace("/login");
        } else {
            router.replace("/intro");
        }
        
        return { imgSrcs };
    }
});
</script>

<style scoped lang="scss">
.load {
    position: absolute;
    opacity: 0;
}
</style>