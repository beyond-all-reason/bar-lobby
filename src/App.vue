<template>
    <div :class="`fullsize theme theme--${theme}`">
        <DebugSidebar/>
        <router-view/>
    </div>
</template>

<script lang="ts">
import { settings } from "@/store/settings";
import { defineComponent } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
    setup() {
        const theme = settings.theme;
        
        const router = useRouter();
        router.replace("/");

        return { theme };
    }
});
</script>