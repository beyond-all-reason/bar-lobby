<route>{ "meta": { "title": "Custom", "order": 2, "offline": true } }</route>

<template>
    <div>
        <Battle />
    </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import Battle from "@/views/multiplayer/battle.vue";

const route = useRoute();
</script>