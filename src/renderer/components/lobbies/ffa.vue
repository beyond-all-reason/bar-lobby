<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Panel>
        <h1>
            <slot name="header" />
        </h1>
        <div class="main-content">
            <div class="flex-row">
                <!-- <div class="map-preview">
                    <MapBattlePreview />
                </div> -->
                <!-- <div class="lobby-chat">
                    <LobbyChat />
                </div> -->
                <div class="player-list">
                    <p>We could replace the player list with a FFA version instead of the standard one.</p>
                    <Playerlist />
                </div>
            </div>
            <main>
                <slot name="main" />
            </main>
        </div>
    </Panel>
</template>

<script lang="ts" setup>
import Panel from "@renderer/components/common/Panel.vue";
// import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import Playerlist from "@renderer/components/battle/Playerlist.vue";
// import LobbyChat from "@renderer/components/lobbies/LobbyChat.vue";
</script>

<style scoped lang="scss">
.map-preview {
    width: 50%;
    max-height: 200px;
}
.main-content {
    display: flex;
    flex-direction: row;
    gap: 10px;
    height: 100%;
}
.player-list {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
    height: 100%;
}
</style>
