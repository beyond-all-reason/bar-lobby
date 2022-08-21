<route lang="json">
{ "meta": { "title": "Multiplayer Custom Battle", "transition": { "name": "slide-left" } } }
</route>

<template>
    <BattleComponent v-if="battle" :battle="battle" />
</template>

<script lang="ts" setup>
import BattleComponent from "@/components/battle/BattleComponent.vue";

const battle = api.session.onlineBattle.value;

if (battle) {
    await api.comms.request("c.user.list_users_from_ids", { id_list: Array.from(battle.userIds.values()), include_clients: true });
}
</script>

<style lang="scss" scoped></style>
