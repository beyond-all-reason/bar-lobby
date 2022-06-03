<route lang="json">
{ "meta": { "title": "Custom", "order": 2, "offline": true, "transition": { "name": "slide-left" } } }
</route>

<template>
    <BattleComponent />
</template>

<script lang="ts" setup>
import BattleComponent from "@/components/battle/BattleComponent.vue";
import { defaultBattle } from "@/config/default-battle";

// TODO: this isn't compatible with online
api.session.currentUser.battleStatus.inBattle = true;
api.session.currentUser.battleStatus.battleId = -1;
api.session.battles.set(-1, defaultBattle());
</script>

<style lang="scss" scoped></style>
