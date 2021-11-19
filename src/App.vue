<template>
    <div :class="`fullsize theme theme--${theme}`">
        <DebugSidebar/>
        <router-view/>
    </div>
</template>

<script lang="ts">
import { settings } from "@/store/settings";
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const theme = settings.theme;

        window.api.getRandomBackground().then(bgUrl => {
            document.documentElement.style.setProperty("--background", `url(${bgUrl})`);
        });

        const router = useRouter();
        router.replace("/");

        return { theme };
    }
});
</script>