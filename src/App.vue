<template>
    <div :class="`fullsize theme theme--${theme}`">
        <DebugSidebar/>
        <router-view/>
    </div>
</template>

<script lang="ts">
import * as fs from "fs";
import * as path from "path";
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

declare const __static: string;

export default defineComponent({
    setup() {
        const theme = window.settings.theme;

        getRandomBackground().then(bgUrl => {
            document.documentElement.style.setProperty("--background", `url(${bgUrl})`);
        });

        const router = useRouter();
        router.replace("/");

        return { theme };
    }
});

async function getRandomBackground() {
    const backgrounds = await fs.promises.readdir(path.join(__static, "backgrounds"));
    const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    return `backgrounds/${background}`;
}
</script>