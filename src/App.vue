<template>
    <div :class="`fullsize theme theme--${theme.toLowerCase()}`">
        <Alert />
        <DebugSidebar />
        <router-view/>
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import Alert from "@/components/Alert.vue";
import DebugSidebar from "@/components/DebugSidebar.vue";

const theme = window.api.settings.model.theme;

const router = useRouter();
router.replace("/");
</script>