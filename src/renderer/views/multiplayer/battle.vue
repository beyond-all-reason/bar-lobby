<route lang="json5">
{ meta: { title: "Multiplayer Custom Battle", availableOffline: false, hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col flex-grow">
        <!-- <BattleComponent v-if="battle" :battle="battle" :me="me" /> -->
        <OnlineBattleComponent />
    </div>
</template>

<script lang="ts" setup>
import OnlineBattleComponent from "@/components/battle/OnlineBattleComponent.vue";

const battle = api.session.onlineBattle.value;
const me = api.session.onlineUser;
</script>

<style lang="scss" scoped></style>
