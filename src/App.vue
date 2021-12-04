<template>
    <div :class="`fullsize theme theme--${theme}`">
        <Alert />
        <DebugSidebar/>
        <router-view/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const theme = window.api.settings.settings.theme;

        // const boot = async () => {
        //     serverError.value = "";

        //     // window.client.socket.on("error", (err) => {
        //     //     serverError.value = err?.message ?? "Server error";
        //     // });

        //     // window.client.socket.on("close", (err) => {
        //     //     serverError.value = "Connection to server lost";
        //     // });
        // };

        const router = useRouter();
        router.replace("/");

        return { theme };
    }
});
</script>