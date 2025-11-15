<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div>
        <div class="flex-row padding-left-sm padding-right-xs">
            <div><MapTinyPreview :map-name="lobbyStore.activeLobby?.mapName" :alignment="'center'" /></div>
            <div class="flex-col inner-size padding-left-sm padding-bottom-sm flex-space-around">
                <p class="lobby-title inner-size txt-md padding-left-xs padding-top-sm padding-bottom-sm">
                    {{ lobbyStore.activeLobby.name }}
                </p>
                <div class="flex-row flex-align-start txt-sm" style="gap: 2px">
                    <div class="flex-row flex-center-items padding-right-md">
                        <Icon :icon="account" height="17" class="padding-right-sm" /> {{ lobbyStore.activeLobby.playerCount }} /
                        {{ lobbyStore.activeLobby.maxPlayerCount }}
                    </div>
                    <div class="flex-row flex-center-items padding-right-md">
                        <Icon :icon="eye" height="17" class="padding-right-sm" /> {{ lobbyStore.activeLobby.spectatorCount }}
                    </div>
                    <div class="flex-row flex-center-items"><i>In-Queue</i></div>
                </div>
            </div>
            <div class="padding-md">
                <Panel :no-padding="true" class="fullheight margin-md flex-center-items">
                    <p>Return To Lobby</p>
                </Panel>
            </div>
        </div>
    </div>
</template>

<script setup>
import MapTinyPreview from "@renderer/components/maps/MapTinyPreview.vue";
import { lobbyStore } from "@renderer/store/lobby.store";
import { Icon } from "@iconify/vue";
import account from "@iconify-icons/mdi/account";
//import swordcross from "@iconify-icons/mdi/sword-cross";
import eye from "@iconify-icons/mdi/eye";
import Panel from "@renderer/components/common/Panel.vue";
</script>

<style>
.lobby-title {
    white-space: nowrap;
    overflow-x: hidden;
    text-overflow: ellipsis;
}

.outer-size {
    max-width: 300px;
}
.inner-size {
    width: 300px;
}
.icon-overlay {
}
.center-content {
    align-content: center;
}
</style>
