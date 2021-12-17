<template>
    <div class="loader">
        <Progress :percent="loadedPercent" />
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ipcRenderer } from "electron";
import { randomFromArray } from "jaz-ts-utils";
import { playRandomMusic } from "@/utils/play-random-music";

export default defineComponent({
    layout: {
        name: "empty",
        props: {
            transition: "fade",
        }
    },
    setup() {
        const router = useRouter();
        const totalFiles = ref(0);
        const loadedFiles = ref(0);
        const loadedPercent = computed(() => loadedFiles.value / totalFiles.value);

        const imageFiles = require.context("@/assets/images/", true).keys();
        const fontFiles = require.context("@/assets/fonts/", true).keys();

        totalFiles.value = imageFiles.length + fontFiles.length;

        onMounted(async () => {
            const randomBg = randomFromArray(imageFiles.filter(src => src.includes("backgrounds")));
            const randomBgBuiltPath = await loadImage(randomBg);
            document.documentElement.style.setProperty("--background", `url(${randomBgBuiltPath})`);

            ipcRenderer.invoke("ready");

            for (const imageFile of imageFiles) {
                await loadImage(imageFile);
                loadedFiles.value++;
            }

            for (const fontFile of fontFiles) {
                await loadFont(fontFile);
                loadedFiles.value++;
            }

            // TODO: get music load progress from howler and load music files at this point
            // might not want to load everything up front, be wary of memory usage

            if (window.api.settings.model.skipIntro.value) {
                playRandomMusic();
                router.replace("/login");
            } else {
                router.replace("/intro");
            }
        });

        return { loadedPercent };
    }
});

function loadImage(url: string) {
    return new Promise<string>((resolve, reject) => {
        const fileName = url.slice(2);
        const buildImagePath = require(`@/assets/images/${fileName}`);
        const image = new Image();
        image.onload = () => {
            resolve(buildImagePath);
        };
        image.onerror = () => {
            reject(`Failed to load image ${url}`);
        };
        image.src = buildImagePath;
    });
}

async function loadFont(url: string) {
    const parts = url.split("/");
    const family = parts[1];
    const fileName = parts[2];
    const [weight, style] = fileName.split(".")[0].split("-");
    const buildFontPath = require(`@/assets/fonts/${family}/${fileName}`);
    const font = new FontFace(family, `url(${buildFontPath})`, { weight, style });
    document.fonts.add(font);
    return font.load();
}
</script>

<style scoped lang="scss">
.load {
    position: absolute;
    opacity: 0;
}
</style>