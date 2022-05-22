<route lang="json">
{ "meta": { "title": "Custom", "order": 2, "offline": true, "transition": { "name": "slide-left" } } }
</route>

<template>
    <BattleComponent />
</template>

<script lang="ts" setup>
import BattleComponent from "@/components/battle/BattleComponent.vue";
import { defaultBattle } from "@/config/default-battle";

api.session.currentBattle.set(defaultBattle());
</script>

<style lang="scss" scoped></style>
