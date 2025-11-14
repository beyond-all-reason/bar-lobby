<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div>
        <div class="flex-row padding-left-sm padding-right-xs">
            <MapTinyPreview :map-name="lobbyStore.activeLobby?.mapName" :alignment="'center'" />
            <div class="flex-col inner-size padding-left-sm">
                <p class="lobby-title inner-size txt-md padding-left-xs padding-top-sm padding-bottom-sm">
                    {{ lobbyStore.activeLobby.name }}
                </p>
                <div class="flex-row flex-center-items txt-sm" style="gap: 2px">
                    <Icon :icon="account" height="17" />{{ lobbyStore.activeLobby.playerCount }} /
                    {{ lobbyStore.activeLobby.maxPlayerCount }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import MapTinyPreview from "@renderer/components/maps/MapTinyPreview.vue";
import { lobbyStore } from "@renderer/store/lobby.store";
import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
</script>

<style>
.lobby-title {
    white-space: nowrap;
    overflow-x: hidden;
    text-overflow: ellipsis;
}

.outer-size {
    max-width: 128px;
}
.inner-size {
    max-width: 96px;
}
</style>
