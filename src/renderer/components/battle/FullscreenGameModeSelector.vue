<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="fullscreen" :class="{ hidden: !battleStore.isSelectingGameMode }" @click.self="closeOverlay">
        <div class="gamemode-container">
            <GameModeSelector @selected="completeSelection" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import GameModeSelector from "@renderer/components/misc/GameModeSelector.vue";
import { battleStore } from "@renderer/store/battle.store";

const emit = defineEmits<{
    closed: [];
}>();

function closeOverlay() {
    battleStore.isSelectingGameMode = false;
}

function completeSelection() {
    battleStore.isSelectingGameMode = false;
    battleStore.isLobbyOpened = true;
    emit("closed");
}
</script>

<style lang="scss" scoped>
.fullscreen {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2;
    transition: all 0.2s ease-in-out;
    &.hidden {
        opacity: 0;
    }
    backdrop-filter: blur(5px) saturate(20%);
}
.hidden {
    pointer-events: none;
}

.gamemode-container {
    display: flex;
    flex-direction: column;
    align-self: center;
    gap: 20px;
    height: 720px;
    width: 1300px;
    overflow: visible;
}
</style>
