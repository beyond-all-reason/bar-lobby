<route lang="json">
{ "meta": { "title": "Custom", "order": 2, "offline": true, "transition": { "name": "slide-left" } } }
</route>

<template>
    <BattleComponent v-if="battle" :battle="battle" :me="me" />
    <div v-else>Error: no offline battle set</div>
</template>

<script lang="ts" setup>
import { onUnmounted } from "vue";

import BattleComponent from "@/components/battle/BattleComponent.vue";
import { defaultBattle } from "@/config/default-battle";

api.session.offlineBattle.value = defaultBattle();
api.session.offlineBattle.value.open();

const battle = api.session.offlineBattle.value;
const me = api.session.offlineUser;

onUnmounted(() => {
    api.session.offlineBattle.value = null;
});
</script>

<style lang="scss" scoped></style>
