<template>
    <div class="load">
        <img v-for="imgSrc in imgSrcs" :key="imgSrc" :src="imgSrc">
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";
import * as fs from "fs";
import * as path from "path";
import * as glob from "glob";

export default defineComponent({
    layout: "empty",
    setup() {
        const imgSrcs = ref([] as Array<string>);
        
        const imageFiles = require.context("@/assets/images/", true).keys();
        for (const imageFile of imageFiles) {
            const fileName = imageFile.slice(2);
            const buildImagePath = require(`@/assets/images/${fileName}`);
            imgSrcs.value.push(buildImagePath);
        }

        const staticImages = glob.sync(path.join(__static, "**/*.{jpg,png,gif,svg}"));
        const staticDir = path.normalize(__static);
        imgSrcs.value.push(...staticImages.map(staticImage => path.normalize(staticImage).split(staticDir)[1]));

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

        const router = useRouter();

        getRandomBackground().then((bgUrl) => {
            document.documentElement.style.setProperty("--background", `url(${bgUrl})`);
            if (window.api.settings.settings.skipIntro.value) {
                router.replace("/login");
            } else {
                router.replace("/intro");
            }
        });
        
        return { imgSrcs };
    }
});

declare const __static: string;

async function getRandomBackground() {
    const backgrounds = await fs.promises.readdir(path.join(__static, "backgrounds"));
    const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    return `/backgrounds/${background}`;
}
</script>

<style scoped lang="scss">
.load {
    position: absolute;
    opacity: 0;
}
</style>