<route>{ "meta": { "title": "Custom", "order": 2, "offline": true } }</route>

<template>
    <div>
        <Battle :players="players" />
    </div>
</template>

<script lang="ts" setup>
import Battle from "@/components/battle/Battle.vue";
import { Player } from "start-script-converter";

const players: Player[] = [
    {
        id: 0,
        name: window.api.session.model.account?.value?.name ?? "Player",
        team: 0
    }
];
</script>