<template>
    <div class="fullsize flex-center">
        <h1>Updating</h1>
        <div>Fetching latest game updates</div>
        <Loader v-if="!percent || percent === 1" />
        <h3 v-else>{{ percent * 100 }}%</h3>
    </div>
</template>

<script lang="ts">
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
const percent = ref(0);

window.api.prDownloader.onProgress.add(progress => {
    percent.value = progress.currentBytes / progress.totalBytes;
});

onMounted(async () => {
    const latestVersionInstalled = await window.api.prDownloader.isLatestVersionInstalled();
    if (!latestVersionInstalled) {
        await window.api.prDownloader.downloadGame();
    }

    console.log("done");

    // try {
    //     await window.api.client.connect();

    //     if (window.api.accounts.model.token.value && window.api.accounts.model.remember.value) {
    //         const loginResponse = await loginRequest({
    //             token: window.api.accounts.model.token.value,
    //             lobby_name: window.info.lobby.name,
    //             lobby_version: window.info.lobby.version,
    //             lobby_hash: window.info.lobby.hash
    //         });

    //         if (loginResponse.result === "success") {
    //             await router.replace("/home");
    //             return;
    //         }
    //     }
    // } catch (error) {
    //     console.error(error);
    // }

    //await router.replace("/login");
});
</script>