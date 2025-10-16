<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="lobby-drawer" :class="{ 'is-open': battleStore.isLobbyOpened && tachyonStore.isConnected }">
        <Panel class="panel" no-padding>
            <BattleComponent :online="battleStore.isOnline" />
        </Panel>
    </div>
    <div class="backdrop" @click="battleStore.isLobbyOpened = false" v-if="battleStore.isLobbyOpened && tachyonStore.isConnected"></div>
</template>

<script lang="ts" setup>
import BattleComponent from "@renderer/components/battle/BattleComponent.vue";
import Panel from "@renderer/components/common/Panel.vue";
import { battleStore } from "@renderer/store/battle.store";
import { onKeyDown } from "@vueuse/core";
import { tachyonStore } from "@renderer/store/tachyon.store";

onKeyDown(
    "Escape",
    (e) => {
        if (battleStore.isLobbyOpened) {
            e.preventDefault();
            e.stopPropagation();
            battleStore.isLobbyOpened = false;
        }
    },
    { target: document }
);
</script>

<style lang="scss" scoped>
.lobby-drawer {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 100%;
    padding-top: 96px;
    width: 900px;
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
