<route lang="json">{ "meta": { "empty": true, "transition": { "name": "fade" } } }</route>

<template>
    <div class="fullsize flex-center">
        <h1>Updating</h1>
        <div>{{ text }}</div>
        <Loader v-if="!percent || percent === 1" />
        <h2 class="percent" v-else>{{ (percent * 100).toFixed(1) }}%</h2>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { storeUserSession } from "@/utils/store-user-session";
import { useRouter } from "vue-router";
import Loader from "@/components/common/Loader.vue";

const router = useRouter();
const text = ref("Fetching latest game updates");
const percent = ref(0);

window.api.content.game.onDlProress.add(progress => {
    percent.value = progress.currentBytes / progress.totalBytes;
});

window.api.content.engine.onDlProgress.add(progress => {
    percent.value = progress.currentBytes / progress.totalBytes;
});

onMounted(async () => {
    const isLatestGameVersionInstalled = await window.api.content.game.isLatestGameVersionInstalled();
    if (!isLatestGameVersionInstalled) {
        await window.api.content.game.updateGame();
    } else {
        console.log("Latest game version already installed");
    }

    text.value = "Fetching latest engine updates";

    const isLatestEngineVersionInstalled = await window.api.content.engine.isLatestEngineVersionInstalled();
    if (!isLatestEngineVersionInstalled) {
        await window.api.content.engine.downloadLatestEngine();
    } else {
        console.log("Latest engine version already installed");
    }

    try {
        await window.api.client.connect();

        if (window.api.accounts.model.token.value && window.api.accounts.model.loginAutomatically.value) {
            const loginResponse = await window.api.client.login({
                token: window.api.accounts.model.token.value,
                lobby_name: window.api.info.lobby.name,
                lobby_version: window.api.info.lobby.version,
                lobby_hash: window.api.info.lobby.hash
            });

            if (loginResponse.result === "success") {
                storeUserSession(loginResponse.user);
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