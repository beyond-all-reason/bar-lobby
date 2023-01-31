<route lang="json5">
{ meta: { empty: true } }
</route>

<template>
    <div />
</template>

<script lang="ts" setup>
import { onMounted } from "vue";

onMounted(async () => {
    try {
        if (api.account.model.token.value && api.settings.model.loginAutomatically.value) {
            await api.comms.connect();

            const loginResponse = await api.comms.request("c.auth.login", {
                token: api.account.model.token.value,
                lobby_name: api.info.lobby.name,
                lobby_version: api.info.lobby.version,
                lobby_hash: api.info.lobby.hash,
            });

            if (loginResponse.result === "success") {
                return;
            }
        }
    } catch (error) {
        console.error(error);
    }

    api.router.replace("/login");
});
</script>

<style lang="scss" scoped></style>
