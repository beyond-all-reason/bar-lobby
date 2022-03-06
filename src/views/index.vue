<route lang="json">{ "meta": { "empty": true } }</route>

<template>
    <div />
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import { storeUserSession } from "@/utils/store-user-session";
import { onMounted } from "vue";

const router = useRouter();

onMounted(async () => {
    try {
        await window.api.client.connect();

        if (window.api.account.model.token.value && window.api.settings.model.loginAutomatically.value) {
            const loginResponse = await window.api.client.login({
                token: window.api.account.model.token.value,
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