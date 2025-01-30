<route lang="json5">
{ meta: { title: "Multiplayer Custom Battle", onlineOnly: true, hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col flex-grow">
        <OfflineBattleComponent />
    </div>
</template>

<script lang="ts" setup>
import OfflineBattleComponent from "@renderer/components/battle/OfflineBattleComponent.vue";
</script>

<style lang="scss" scoped></style>
