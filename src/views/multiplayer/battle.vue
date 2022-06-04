<route lang="json">
{ "meta": { "title": "Multiplayer Custom Battle", "transition": { "name": "slide-left" } } }
</route>

<template>
    <BattleComponent v-if="battle" :battle="battle" />
</template>

<script lang="ts" setup>
import BattleComponent from "@/components/battle/BattleComponent.vue";

const battle = api.session.currentBattle;
</script>

<style lang="scss" scoped></style>
