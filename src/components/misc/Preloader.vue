<template>
    <div class="fullsize flex-center">
        <Progress :percent="loadedPercent" style="width: 70%" />
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { randomFromArray } from "jaz-ts-utils";
import Progress from "@/components/common/Progress.vue";

const emit = defineEmits(["loaded"]);

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

    for (const imageFile of imageFiles) {
        await loadImage(imageFile);
        loadedFiles.value++;
    }

    for (const fontFile of fontFiles) {
        await loadFont(fontFile);
        loadedFiles.value++;
    }

    emit("loaded");
});

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
</script>