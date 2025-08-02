<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Custom", order: 2, devOnly: true, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="custom-game-container">
            <div class="view-title">
                <h1>Custom game</h1>
                <p>Play against the AI in a custom game mode.</p>
            </div>
            <GameModeSelector />
        </div>
    </div>
</template>

<script lang="ts" setup>
import GameModeSelector from "@renderer/components/misc/GameModeSelector.vue";
</script>

<style lang="scss" scoped>
.custom-game-container {
    display: flex;
    flex-direction: column;
    align-self: center;
    gap: 20px;
    height: 100%;
    width: 1300px;
    overflow: visible;
}
</style>
