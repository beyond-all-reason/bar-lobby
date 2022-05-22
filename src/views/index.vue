<route lang="json">
{ "meta": { "empty": true } }
</route>

<template>
    <div />
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import { storeUserSession } from "@/utils/store-user-session";

const router = useRouter();

onMounted(async () => {
    try {
        await api.client.connect();

        if (api.account.model.token.value && api.settings.model.loginAutomatically.value) {
            const loginResponse = await api.client.request("c.auth.login", {
                token: api.account.model.token.value,
                lobby_name: api.info.lobby.name,
                lobby_version: api.info.lobby.version,
                lobby_hash: api.info.lobby.hash,
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

<style lang="scss" scoped></style>
