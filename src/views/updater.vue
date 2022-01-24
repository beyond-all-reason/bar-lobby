<template>
    <div class="fullsize flex-center">
        <h1>Updating</h1>
        <div>{{ text }}</div>
        <Loader v-if="!percent || percent === 1" />
        <h3 v-else>{{ percent * 100 }}%</h3>
    </div>
</template>

<script lang="ts">
import { loginRequest } from "@/utils/login-request";
import { defineComponent, ref } from "vue";

export default defineComponent({
    layout: {
        name: "default",
        props: {
            empty: true,
            transitionName: "preloader",
            blurBg: true
        }
    }
});
</script>

<script lang="ts" setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const text = ref("Fetching latest game updates");
const percent = ref(0);

window.api.content.onGameProress.add(progress => {
    percent.value = progress.currentBytes / progress.totalBytes;
});

window.api.content.onEngineProgress.add(progress => {
    percent.value = progress.currentBytes / progress.totalBytes;
});

onMounted(async () => {
    const isLatestGameVersionInstalled = await window.api.content.isLatestGameVersionInstalled();
    if (!isLatestGameVersionInstalled) {
        await window.api.content.updateGame();
    }

    text.value = "Fetching latest engine updates";

    const isLatestEngineVersionInstalled = await window.api.content.isLatestEngineVersionInstalled();
    if (!isLatestEngineVersionInstalled) {
        await window.api.content.downloadLatestEngine();
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