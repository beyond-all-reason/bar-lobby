<template>
    <div class="loader fullsize flex-center">
        <Progress :percent="loadedPercent" style="width: 70%" />
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
    layout: {
        name: "default",
        props: {
            empty: true,
            transitionName: "preloader"
        }
    }
});
</script>

<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { randomFromArray } from "jaz-ts-utils";
import { loadFont } from "@/utils/load-font";
import { loadImage } from "@/utils/load-image";
import { loginRequest } from "@/utils/login-request";

const router = useRouter();
const totalFiles = ref(0);
const loadedFiles = ref(0);
const loadedPercent = computed(() => loadedFiles.value / totalFiles.value);

const imageFiles = require.context("@/assets/images/", true).keys();
const fontFiles = require.context("@/assets/fonts/", true).keys();

totalFiles.value = imageFiles.length + fontFiles.length;

onMounted(async () => {
    // TODO: get music load progress from howler and load music files at this point
    // might not want to load everything up front, be wary of memory usage

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

    try {
        await window.api.client.connect();

        if (window.api.accounts.model.token.value && window.api.accounts.model.remember.value) {
            const loginResponse = await loginRequest({
                token: window.api.accounts.model.token.value,
                lobby_name: window.info.lobby.name,
                lobby_version: window.info.lobby.version,
                lobby_hash: window.info.lobby.hash
            });

            if (loginResponse.result === "success") {
                await router.replace("/home");
                return;
            }
        }
    } catch (error) {
        console.error(error);
    }

    await router.replace("/login");
});
</script>

<style scoped lang="scss">
.load {
    position: absolute;
    opacity: 0;
}
</style>