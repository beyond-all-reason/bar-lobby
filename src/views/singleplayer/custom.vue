<route lang="json">{ "meta": { "title": "Custom", "order": 2, "offline": true, "transition": { "name": "slide-left" } } }</route>

<template>
    <Battle :offline="true" />
</template>

<script lang="ts" setup>
import Battle from "@/components/battle/Battle.vue";

window.api.battle.resetToDefault();
</script>