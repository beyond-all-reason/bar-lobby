<route lang="json">
{ "meta": { "title": "Custom", "order": 2, "offline": true, "transition": { "name": "slide-left" } } }
</route>

<template>
    <BattleComponent v-if="battle" :battle="battle" :me="me" />
    <div v-else>Error: no offline battle set</div>
</template>

<script lang="ts" setup>
import BattleComponent from "@/components/battle/BattleComponent.vue";

const battle = api.session.offlineBattle.value;
const me = api.session.offlineUser;
</script>

<style lang="scss" scoped></style>
