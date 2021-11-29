<template>
    <div :class="`fullsize theme theme--${theme}`">
        <Dialog type="error" title="Server Error" v-model="serverError" />
        <DebugSidebar/>
        <router-view/>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const theme = window.settings.theme;
        const serverError = ref("");

        window.client.socket.on("error", (err) => {
            serverError.value = err?.message ?? "Server error";
        });

        window.client.socket.on("close", (err) => {
            serverError.value = "Connection to server lost";
        });

        const router = useRouter();
        router.replace("/");

        return { theme, serverError };
    }
});
</script>