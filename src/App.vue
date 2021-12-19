<template>
    <div :class="`fullsize theme theme--${theme.toLowerCase()}`">
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
        const theme = window.api.settings.model.theme;

        const router = useRouter();
        router.replace("/");

        return { theme };
    }
});
</script>