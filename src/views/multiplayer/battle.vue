<route lang="json">
{ "meta": { "title": "Multiplayer Custom Battle", "transition": { "name": "slide-left" } } }
</route>

<template>
    <BattleComponent v-if="battle" :battle="battle" />
</template>

<script lang="ts" setup>
import BattleComponent from "@/components/battle/BattleComponent.vue";

const battle = api.session.onlineBattle;

if (battle) {
    // TODO: need a way to store script name
    api.content.maps.downloadMapByScriptName(battle?.battleOptions.mapFileName);
}
</script>

<style lang="scss" scoped></style>
