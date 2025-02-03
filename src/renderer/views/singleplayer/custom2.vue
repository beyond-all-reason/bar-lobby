<route lang="json5">
{ meta: { title: "Custom 2", order: 3, blurBg: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="custom-game-container">
            <div class="view-title">
                <h1>Custom game</h1>
                <p>Play against the AI in a custom game mode.</p>
            </div>
            <Panel>
                <OfflineBattleComponent />
            </Panel>
        </div>
    </div>
</template>

<script lang="ts" setup>
import OfflineBattleComponent from "@renderer/components/battle/OfflineBattleComponent.vue";
import Panel from "@renderer/components/common/Panel.vue";
</script>

<style lang="scss" scoped>
.custom-game-container {
    display: flex;
    flex-direction: column;
    align-self: center;
    gap: 20px;
    height: 100%;
    width: 1000px;
    width: clamp(50vw, 100rem, 100vw);
    overflow: visible;
    padding: 1rem;
}
</style>
