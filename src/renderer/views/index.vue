<route lang="json5">
{ meta: { empty: true } }
</route>

<template>
    <div />
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(async () => {
    const account = await window.account.getAccount();
    const settings = await window.settings.getSettings();
    try {
        if (account.token && settings.loginAutomatically) {
            // await api.comms.connect();
            // const loginResponse = await api.comms.request("c.auth.login", {
            //     token: account.token,
            //     lobby_name: infosStore.lobby.name,
            //     lobby_version: infosStore.lobby.version,
            //     lobby_hash: infosStore.lobby.hash,
            // });
            // if (loginResponse.result === "success") {
            //     return;
            // }
        }
    } catch (error) {
        console.error(error);
    }

    router.replace("/login");
});
</script>

<style lang="scss" scoped></style>
