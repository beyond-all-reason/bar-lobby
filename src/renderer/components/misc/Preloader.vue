<template>
    <div class="fullsize flex-center">
        <Progress :percent="loadedPercent" :height="40" style="width: 70%" />
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "jaz-ts-utils";
import * as path from "path";
import { computed, onMounted, ref } from "vue";

import Progress from "@/components/common/Progress.vue";

const emit = defineEmits(["complete"]);

const totalFiles = ref(0);
const loadedFiles = ref(0);
const loadedPercent = computed(() => loadedFiles.value / totalFiles.value);

const backgroundImages = import.meta.glob("@/assets/images/backgrounds/**/*", { query: "?url", import: "default" });
const randomBackgroundImage = randomFromArray(Object.keys(backgroundImages))?.split("/assets/")[1];
document.documentElement.style.setProperty("--background", `url(${randomBackgroundImage})`);

const fontFiles = import.meta.glob("@/assets/fonts/*", { query: "?url", import: "default" });

totalFiles.value = Object.keys(fontFiles).length;

onMounted(async () => {
    for (const fontFile in fontFiles) {
        const resolvedUrl = fontFile.split("assets/")[1];
        await loadFont(resolvedUrl);
        loadedFiles.value++;
    }

    api.audio.load();

    emit("complete");
});

async function loadFont(url: string) {
    const fileName = path.parse(url).name.split(".")[0];
    const [family, weight, style] = fileName.split("-");
    const font = new FontFace(family, `url(${url})`, { weight, style });
    document.fonts.add(font);
    return font.load();
}
</script>

<style lang="scss" scoped></style>
