<template>
    <div class="fullsize flex-center">
        <Progress :percent="loadedPercent" :height="40" style="width: 70%" />
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "$/jaz-ts-utils/object";
import { computed, onMounted, ref } from "vue";

import Progress from "@renderer/components/common/Progress.vue";
import { audioApi } from "@renderer/audio/audio";
import { backgroundImages, fontFiles } from "@renderer/assets/assetFiles";

const emit = defineEmits(["complete"]);

const totalFiles = Object.values(fontFiles).length;
const loadedFiles = ref(0);
const loadedPercent = computed(() => loadedFiles.value / totalFiles);

console.debug(`Loading ${totalFiles} font files...`);
console.debug(`Loading ${Object.values(backgroundImages).length} background images...`);
const randomBackgroundImage = randomFromArray(Object.values(backgroundImages));
console.debug("Setting background image:", randomBackgroundImage);
document.documentElement.style.setProperty("--background", `url(${randomBackgroundImage})`);

onMounted(async () => {
    try {
        for (const fontFile of Object.values(fontFiles)) {
            await loadFont(fontFile);
            loadedFiles.value++;
        }
    } catch (error) {
        console.error(`Failed to load fonts: `, error);
    }
    audioApi.load();
    emit("complete");
});

async function loadFont(url: string) {
    console.debug("Loading font:", url);
    const fileName = url.split("/").pop()!.split(".")[0];
    const [family, weight, style] = fileName.split("-");
    const font = new FontFace(family, `url(${url})`, { weight, style });
    document.fonts.add(font);
    return font.load();
}
</script>

<style lang="scss" scoped></style>
