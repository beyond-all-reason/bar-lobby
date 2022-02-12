<template>
    <div class="fullsize flex-center">
        <h1>Updating</h1>
        <div>{{ text }}</div>
        <Loader v-if="!percent || percent === 1" />
        <h2 class="percent" v-else>{{ (percent * 100).toFixed(1) }}%</h2>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import * as dns from "dns";

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
import { storeUserSession } from "@/utils/store-user-session";
import { useRouter } from "vue-router";
import Loader from "@/components/common/Loader.vue";
import { api } from "@/api/api";

const router = useRouter();
const text = ref("Fetching latest game updates");
const percent = ref(0);

api.content.game.onDlProress.add(progress => {
    percent.value = progress.currentBytes / progress.totalBytes;
});

api.content.engine.onDlProgress.add(progress => {
    percent.value = progress.currentBytes / progress.totalBytes;
});

onMounted(async () => {
    const internetConnected = await isConnectedToInternet();
    if (!internetConnected) {
        await router.replace("/home");
        return;
    }

    const isLatestGameVersionInstalled = await api.content.game.isLatestGameVersionInstalled();
    if (!isLatestGameVersionInstalled) {
        await api.content.game.updateGame();
    } else {
        console.log("Latest game version already installed");
    }

    text.value = "Fetching latest engine updates";

    const isLatestEngineVersionInstalled = await api.content.engine.isLatestEngineVersionInstalled();
    if (!isLatestEngineVersionInstalled) {
        await api.content.engine.downloadLatestEngine();
    } else {
        console.log("Latest engine version already installed");
    }

    try {
        await api.client.connect();

        if (api.accounts.model.token.value && api.accounts.model.remember.value) {
            const loginResponse = await api.client.login({
                token: api.accounts.model.token.value,
                lobby_name: api.info.lobby.name,
                lobby_version: api.info.lobby.version,
                lobby_hash: api.info.lobby.hash
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

async function isConnectedToInternet() {
    try {
        const lookup = await dns.promises.lookup("google.com");
        if (lookup.address) {
            return true;
        }
    } catch (err) {
        return false;
    }
    return false;
}
</script>