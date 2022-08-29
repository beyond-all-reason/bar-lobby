<route lang="json">
{ "meta": { "empty": true } }
</route>

<template>
    <div />
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(async () => {
    try {
        await api.comms.connect();

        if (api.account.model.token.value && api.settings.model.loginAutomatically.value) {
            const response = await api.comms.request("c.auth.login", {
                token: api.account.model.token.value,
                lobby_name: api.info.lobby.name,
                lobby_version: api.info.lobby.version,
                lobby_hash: api.info.lobby.hash,
            });

            if (response.result !== "success") {
                throw new Error(response.reason);
            }
        }
    } catch (error) {
        console.warn(error);
        await router.replace("/login");
    }
});
</script>

<style lang="scss" scoped></style>
