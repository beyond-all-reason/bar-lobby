<route lang="json5">
{ meta: { title: "Custom 2", order: 3, blurBg: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="custom-game-container">
            <OfflineBattleComponent />
        </div>
    </div>
</template>

<script lang="ts" setup>
import OfflineBattleComponent from "@renderer/components/battle/OfflineBattleComponent.vue";
</script>

<style lang="scss" scoped>
.custom-game-container {
    display: flex;
    flex-direction: column;
    align-self: center;
    height: 100%;
    width: clamp(50vw, 100rem, 100vw);
    overflow: visible;
}
</style>
