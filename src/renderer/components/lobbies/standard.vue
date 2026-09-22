<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<!-- Standard Lobby layout for team-based matches. The purpose of this component is only to hold the layout for this type.
 By doing so, the parent view (lobby.vue typically) can simply pass along relevant components to their appropriate slots. -->

<template>
    <header>
        <slot name="header" />
    </header>
    <div class="flex-row flex-grow lobby-content">
        <div class="main-content">
            <div class="player-list">
                <slot name="player-list" />
            </div>
            <div class="center-column">
                <div class="vote-panel-slot">
                    <slot name="vote-panel" />
                </div>
                <div class="chat-slot">
                    <slot name="chat" />
                </div>
            </div>
            <div class="map-and-options">
                <slot name="map-and-options" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup></script>

<style scoped lang="scss">
.map-and-options {
    width: 25%;
}
.lobby-content {
    flex: 1 1 0;
    min-height: 0;
}
.main-content {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex: 1 1 auto;
    gap: 10px;
    min-height: 0;
}
.player-list {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    width: 25%;
}
.center-column {
    display: flex;
    flex-direction: column;
    flex-grow: 2;
    gap: 10px;
    min-height: 0;
    position: relative;
}
.vote-panel-slot {
    flex-shrink: 0;
}
.chat-slot {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
}
</style>
