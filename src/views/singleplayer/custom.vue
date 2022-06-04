<route lang="json">
{ "meta": { "title": "Custom", "order": 2, "offline": true, "transition": { "name": "slide-left" } } }
</route>

<template>
    <BattleComponent :battle="battle" />
</template>

<script lang="ts" setup>
import BattleComponent from "@/components/battle/BattleComponent.vue";
import { defaultBattle } from "@/config/default-battle";

const battle = api.session.currentBattle;
battle.set(defaultBattle());
</script>

<style lang="scss" scoped></style>
