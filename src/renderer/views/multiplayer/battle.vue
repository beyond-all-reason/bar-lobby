<route lang="json5">
{ meta: { title: "Multiplayer Custom Battle", availableOffline: false, hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col flex-grow">
        <OnlineBattleComponent />
    </div>
</template>

<script lang="ts" setup>
import OnlineBattleComponent from "@renderer/components/battle/OnlineBattleComponent.vue";
</script>

<style lang="scss" scoped></style>
