<template>
    <div class="lobby-drawer" :class="{ 'is-open': matchmakingStore.isDrawerOpen }">
        <Panel class="panel" no-padding>
            <!-- <OfflineBattleComponent /> -->
        </Panel>
    </div>
    <div class="backdrop" @click="matchmakingStore.isDrawerOpen = false" v-if="matchmakingStore.isDrawerOpen"></div>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
import { matchmakingStore } from "@renderer/store/matchmaking.store";
</script>

<style lang="scss" scoped>
.lobby-drawer {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 100%;
    padding-top: 96px;
    width: 1000px;
    transform: translateX(-100%);
    transition: all 0.4s ease-out;
    z-index: 2;
    &.is-open {
        transform: translateX(0);
    }
    box-shadow: 0 0 8px 1px rgba(0, 0, 0, 0.7);
}

.backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    // background-color: rgba(22, 22, 22, 0.6);
    backdrop-filter: blur(5px) saturate(20%);
    z-index: 1;
    transition: all 0.4s ease-in-out;
}

.panel {
    height: 100%;
    padding: 20px;
    background: linear-gradient(rgb(61 61 61), rgb(28 24 30), rgb(0 0 0));
    border: none;
    border-right: 2px solid rgba(255, 255, 255, 0.1);
    box-shadow: none;
}
</style>
