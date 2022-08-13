<route lang="json">
{ "meta": { "title": "Custom", "order": 2, "offline": true, "transition": { "name": "slide-left" } } }
</route>

<template>
    <BattleComponent v-if="battle" :battle="battle" />
</template>

<script lang="ts" setup>
import BattleComponent from "@/components/battle/BattleComponent.vue";

const battle = api.session.offlineBattle.value;
</script>

<style lang="scss" scoped></style>
