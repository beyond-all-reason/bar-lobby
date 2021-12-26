<template>
    <div :class="`fullsize theme theme--${theme.toLowerCase()}`">
        <Alert />
        <DebugSidebar/>
        <router-view/>
    </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";

const theme = window.api.settings.model.theme;

const router = useRouter();
router.replace("/");
</script>