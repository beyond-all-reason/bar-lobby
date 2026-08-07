<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Lobby", hide: true, transition: { name: "slide-left" } } }
</route>

<template>
    <Panel>
        <div class="flex flex-row">
            <Button @click="startGame()" class="green" :disabled="isMapNeeded">Start Game</Button>
            <Button @click="joinQueue()" class="green">Join Queue</Button>
            <Button @click="joinSpectate()" class="green">Join Spectate</Button>
            <Button @click="updateReadiness(true)" class="green">Ready</Button>
            <Button @click="updateReadiness(false)" class="red">Not Ready</Button>
            <Button @click="fetchMap()" class="red flex-right" :disabled="!isMapNeeded || downloadsStore.isPathChanging"
                >Download Map</Button
            >
            <Button @click="leaveLobby()" class="flex-right">Tachyon:Leave Lobby</Button>
        </div>
        <div v-if="lobbyStore.activeLobby">
            <div>
                <div v-for="(item, name, index) in lobbyStore.activeLobby" :key="index" :class="getStripeResult(index)">
                    <div class="margin-left-sm padding-top-sm padding-bottom-sm">
                        <p class="txt-md">
                            <b>{{ name }}</b>
                        </p>
                    </div>
                    <div class="margin-right-sm padding-top-sm padding-bottom-sm txt-right">
                        <div v-if="name == 'allyTeamConfig' || name == 'players' || name == 'spectators' || name == 'currentBattle'">
                            <ul>
                                <div v-for="(i, n, x) in item" :key="x">
                                    <li>{{ n }} - {{ i }}</li>
                                </div>
                            </ul>
                        </div>
                        <div v-else>
                            <p class="txt-md">{{ item }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Panel>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { downloadsStore } from "@renderer/store/downloads.store";
import { router } from "@renderer/router";
import { mapsStore, downloadMap } from "@renderer/store/maps.store";

function getStripeResult(index: number) {
    return index & 1 ? "datagrid" : "datagrid datagridstripe";
}

function fetchMap() {
    downloadMap(lobbyStore.activeLobby!.mapName);
}

function leaveLobby() {
    lobby.requestLeaveLobby();
    router.push("/play/customLobbies");
}

function startGame() {
    lobby.requestStartBattle();
}
function joinQueue() {
    lobby.requestJoinQueue();
}
function joinSpectate() {
    lobby.requestSpectate();
}
// TODO: Ready status should be automatically watched. This is temp for manually claiming readiness.
function updateReadiness(isReady: boolean) {
    lobby.requestUpdateClientStatus({ isReady: isReady });
}
const isMapNeeded = computed(() => {
    return lobbyStore.activeLobby ? !mapsStore.availableMapNames.has(lobbyStore.activeLobby.mapName) : false;
});
</script>

<style>
.datagrid {
    display: grid;
    grid-template-columns: 15% 1fr;
    height: auto;
}
.datagridstripe {
    background-color: #00000033;
}
</style>
