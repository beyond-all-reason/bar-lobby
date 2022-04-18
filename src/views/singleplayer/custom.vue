<route lang="json">{ "meta": { "title": "Custom", "order": 2, "offline": true, "transition": { "name": "slide-left" } } }</route>

<template>
    <Battle />
</template>

<script lang="ts" setup>
import Battle from "@/components/battle/Battle.vue";
import { defaultBattle } from "@/config/default-battle";

window.api.session.currentBattle.set(defaultBattle());
</script>