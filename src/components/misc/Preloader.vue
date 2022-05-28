<template>
    <div class="fullsize flex-center">
        <Progress :percent="loadedPercent" :height="40" style="width: 70%" />
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "jaz-ts-utils";
import { computed, onMounted, ref } from "vue";

import Progress from "@/components/common/Progress.vue";

const emit = defineEmits(["complete"]);

const totalFiles = ref(0);
const loadedFiles = ref(0);
const loadedPercent = computed(() => loadedFiles.value / totalFiles.value);

const imageFiles = require.context("@/assets/images/", true).keys();
const fontFiles = require.context("@/assets/fonts/", true).keys();

totalFiles.value = imageFiles.length + fontFiles.length;

onMounted(async () => {
    const randomBg = randomFromArray(imageFiles.filter((src) => src.includes("backgrounds")))!;
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

    // await api.content.engine.init();
    // const anyEngineInstalled = api.content.engine.installedVersions.length > 0;
    // if (!anyEngineInstalled) {
    //     installStage.value = "Engine";
    //     await api.content.engine.downloadLatestEngine();
    // }

    // const latestEngine = lastInArray(api.content.engine.installedVersions)!;
    // const binaryName = process.platform === "win32" ? "pr-downloader.exe" : "pr-downloader";
    // const prBinaryPath = path.join(api.settings.model.dataDir.value, "engine", latestEngine, binaryName);
    // await api.content.game.init(prBinaryPath);
    // const anyGameInstalled = api.content.game.installedVersions.length > 0;
    // if (!anyGameInstalled) {
    //     installStage.value = "Game";
    //     await api.content.game.updateGame();
    // }

    // await api.content.maps.init();

    // installStage.value = "Default Maps";
    // await api.content.maps.downloadMaps(defaultMaps);

    emit("complete");
});

async function loadFont(url: string) {
    const parts = url.split("/");
    const family = parts[1];
    const fileName = parts[2];
    const [weight, style] = fileName.split(".")[0].split("-");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const buildFontPath = require(`@/assets/fonts/${family}/${fileName}`);
    const font = new FontFace(family, `url(${buildFontPath})`, { weight, style });
    document.fonts.add(font);
    return font.load();
}

function loadImage(url: string) {
    return new Promise<string>((resolve, reject) => {
        const fileName = url.slice(2);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
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

// const downloadPercent = computed(() => {
//     const downloads = api.content.engine.currentDownloads.concat(api.content.game.currentDownloads, api.content.maps.currentDownloads);

//     if (downloads.length === 0) {
//         return 1;
//     }

//     console.log(downloads);

//     let currentBytes = 0;
//     let totalBytes = 0;

//     for (const download of downloads) {
//         currentBytes += download.currentBytes;
//         totalBytes += download.totalBytes;
//     }

//     return (currentBytes / totalBytes) || 0;
// });
</script>

<style lang="scss" scoped></style>
