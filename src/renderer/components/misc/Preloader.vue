<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullsize flex-center">
        <h1>{{ t("lobby.components.misc.preloader.loading") }}</h1>
        <h4>{{ text }}</h4>
        <Progress :percent="loadedPercent" :height="40" style="width: 70%" />
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "$/jaz-ts-utils/object";
import { computed, onMounted, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import Progress from "@renderer/components/common/Progress.vue";
import { audioApi } from "@renderer/audio/audio";
import { backgroundImages, fontFiles } from "@renderer/assets/assetFiles";
import { fetchMissingMapImages, initMapsStore } from "@renderer/store/maps.store";
import { initReplaysStore } from "@renderer/store/replays.store";
import { initDb } from "@renderer/store/db";

const { t } = useTypedI18n();

const emit = defineEmits(["complete"]);

const thingsToPreload: [string, () => Promise<unknown>][] = [
    [t("lobby.components.misc.preloader.loadingFonts"), loadAllFonts],
    [t("lobby.components.misc.preloader.initializingIndexDB"), initDb],
    [t("lobby.components.misc.preloader.initializingMaps"), initMapsStore],
    [t("lobby.components.misc.preloader.fetchingMissingMapImages"), fetchMissingMapImages],
    [t("lobby.components.misc.preloader.initializingReplays"), initReplaysStore],
];

const total = Object.values(fontFiles).length + thingsToPreload.length;
const text = ref("");
const progress = ref(0);
const loadedPercent = computed(() => progress.value / total);

console.debug(`Loading ${total} font files...`);
console.debug(`Loading ${Object.values(backgroundImages).length} background images...`);
const randomBackgroundImage = randomFromArray(Object.values(backgroundImages));
console.debug("Setting background image:", randomBackgroundImage);
document.documentElement.style.setProperty("--background", `url(${randomBackgroundImage})`);

onMounted(async () => {
    for (const [label, thing] of thingsToPreload) {
        text.value = label;
        await thing();
        progress.value++;
    }
    audioApi.load();

    // Signal to main process that renderer is ready to receive events
    window.barNavigation.signalReady();

    emit("complete");
});

async function loadAllFonts() {
    const promises: Promise<unknown>[] = [];
    for (const fontFile of Object.values(fontFiles)) {
        promises.push(loadFont(fontFile));
    }
    await Promise.all(promises);
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
