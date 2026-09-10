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
    <div class="flex-row">
        <div class="main-content">
            <div class="player-list">
                <slot name="player-list" />
            </div>
            <div class="chat-container">
                <slot name="chat" />
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
.main-content {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    flex-grow: 1;
    gap: 10px;
    height: 100%;
}
.player-list {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    width: 25%;
}
.chat-container {
    display: flex;
    flex-direction: column;
    flex-grow: 2;
    gap: 10px;
    height: 100%;
}
</style>
