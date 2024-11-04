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
import { initMapsStore } from "@renderer/store/maps.store";
import { initReplaysStore } from "@renderer/store/replays.store";
import { initDb } from "@renderer/store/db";

const emit = defineEmits(["complete"]);

const thingsToPreload = [initDb, loadAllFonts, initMapsStore, initReplaysStore];

const total = Object.values(fontFiles).length + thingsToPreload.length;
const progress = ref(0);
const loadedPercent = computed(() => progress.value / total);

console.debug(`Loading ${total} font files...`);
console.debug(`Loading ${Object.values(backgroundImages).length} background images...`);
const randomBackgroundImage = randomFromArray(Object.values(backgroundImages));
console.debug("Setting background image:", randomBackgroundImage);
document.documentElement.style.setProperty("--background", `url(${randomBackgroundImage})`);

onMounted(async () => {
    try {
        for (const thing of thingsToPreload) {
            await thing();
            progress.value++;
        }
    } catch (error) {
        console.error(`Failed to preload: `, error);
    }
    audioApi.load();
    emit("complete");
});

async function loadAllFonts() {
    for (const fontFile of Object.values(fontFiles)) {
        await loadFont(fontFile);
    }
}

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
