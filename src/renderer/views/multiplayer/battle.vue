<route lang="json5">
{ meta: { title: "Multiplayer Custom Battle", availableOffline: false, hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col flex-grow">
        <BattleComponent v-if="battle" :battle="battle" :me="me" />
    </div>
</template>

<script lang="ts" setup>
import BattleComponent from "@renderer/components/battle/BattleComponent.vue";

const battle = api.session.onlineBattle.value;
const me = api.session.onlineUser;
</script>

<style lang="scss" scoped></style>
