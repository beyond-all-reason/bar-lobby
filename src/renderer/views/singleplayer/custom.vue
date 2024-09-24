<route lang="json5">
{ meta: { title: "Custom", order: 2, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col flex-grow">
        <OfflineBattleComponent v-if="battle" :battle="battle" :me="me" />
        <div v-else>Error: no offline battle set</div>
    </div>
</template>

<script lang="ts" setup>
import { onUnmounted } from "vue";

import OfflineBattleComponent from "@/components/battle/OfflineBattleComponent.vue";
import { defaultBattle } from "@/config/default-battle";

api.session.offlineBattle.value = defaultBattle();
// Currently no implementation
//api.session.offlineBattle.value.open();

const battle = api.session.offlineBattle.value;
const me = api.session.offlineUser;

onUnmounted(() => {
    api.session.offlineBattle.value = null;
});
</script>

<style lang="scss" scoped></style>
