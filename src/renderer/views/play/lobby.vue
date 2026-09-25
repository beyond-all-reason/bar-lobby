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
            <Button v-if="lobbyStore.activeLobby" @click="editLobbyModalIsOpen = true" class="blue">Edit Battle</Button>
            <Button @click="joinQueue()" class="green">Join Queue</Button>
            <Button @click="joinSpectate()" class="green">Join Spectate</Button>
            <Button @click="updateReadiness(true)" class="green">Ready</Button>
            <Button @click="updateReadiness(false)" class="red">Not Ready</Button>
            <Button @click="fetchMap()" class="red flex-right" :disabled="!isMapNeeded || contentsStore.isPathChanging"
                >Download Map</Button
            >
            <Button @click="switchLobbyTemplate()" class="flex-right">Switch Template</Button>
        </div>
        <div v-if="lobbyStore.activeLobby" class="lobby-body">
            <component :is="switchTemplate ? FFALobby : StandardLobby">
                <template #header>
                    <div class="flex flex-row fullwidth margin-top-md margin-bottom-md gap-md">
                        <Button v-tooltip.bottom="'Back'" class="icon close" @click="goBack">
                            <Icon :icon="arrowBackIcon" :height="24" />
                        </Button>
                        <p class="title flex-left">{{ lobbyStore.activeLobby?.name }}</p>
                        <div>
                            <Button @click="editLobbyModalIsOpen = true" :title="'Edit Lobby'"
                                ><Icon :icon="pencilIcon" class="flex-right" width="24px" height="24px"
                            /></Button>
                        </div>
                        <Button @click="leaveLobby()" class="red flex">Leave</Button>
                        <HostBattle v-model="editLobbyModalIsOpen" mode="update" :active-lobby="lobbyStore.activeLobby" />
                    </div>
                </template>
                <template #player-list><Playerlist /></template>
                <template #vote-panel><VotePanel /></template>
                <template #chat><ChatPanel type="lobby" :id="lobbyStore.activeLobby?.id" /></template>
                <template #map-and-options>
                    <div class="options">
                        <MapBattlePreview :map="map" :map-options="mapOptions" :arrangement="arrangement" />
                        <div class="flex-row flex-space-between">
                            <div class="flex-row gap-lg flex-center-items">
                                <div class="flex-row flex-center-items gap-sm">
                                    <Icon :icon="personIcon" />{{ map?.playerCountMin }} - {{ map?.playerCountMax }}
                                </div>
                                <div class="flex-row flex-center-items gap-sm">
                                    <Icon :icon="gridIcon" />{{ map?.mapWidth }} x {{ map?.mapHeight }}
                                </div>
                            </div>
                            <div class="flex-row flex-justify-end">
                                <div class="flex-row flex-center-items gap-sm">
                                    <TerrainIcon v-for="terrain in map?.terrain" :terrain="terrain" v-bind:key="terrain" />
                                </div>
                            </div>
                        </div>
                        <div class="flex-row gap-md">
                            <Select
                                :modelValue="map"
                                :options="mapListOptions"
                                data-key="springName"
                                :label="t(`lobby.multiplayer.custom.lobby.map`)"
                                optionLabel="springName"
                                :filter="true"
                                class="fullwidth"
                                :disabled="true"
                            />
                        </div>
                        <div v-if="settingsStore.devMode">
                            <Select
                                :modelValue="battleStore.battleOptions.gameVersion"
                                :options="gameListOptions"
                                optionLabel="gameVersion"
                                optionValue="gameVersion"
                                :label="t(`lobby.multiplayer.custom.lobby.gameVersion`)"
                                :filter="true"
                                :placeholder="battleStore.battleOptions.gameVersion"
                                @update:model-value="onGameSelected"
                                :disabled="battleStore.isOnline"
                            />
                        </div>
                        <div v-if="settingsStore.devMode">
                            <Select
                                :modelValue="enginesStore.selectedEngineVersion"
                                @update:model-value="(engine) => (enginesStore.selectedEngineVersion = engine)"
                                :options="enginesStore.availableEngineVersions"
                                data-key="id"
                                optionLabel="id"
                                :label="t(`lobby.multiplayer.custom.lobby.engineVersion`)"
                                :filter="true"
                                class="fullwidth"
                                :disabled="battleStore.isOnline"
                            />
                        </div>
                    </div>
                </template>
                <template #main>
                    <div>
                        <div v-for="(item, name, index) in lobbyStore.activeLobby" :key="index" :class="getStripeResult(index)">
                            <div class="margin-left-sm padding-top-sm padding-bottom-sm">
                                <p class="txt-md">
                                    <b>{{ name }}</b>
                                </p>
                            </div>
                            <div class="margin-right-sm padding-top-sm padding-bottom-sm txt-right">
                                <div
                                    v-if="name == 'allyTeamConfig' || name == 'players' || name == 'spectators' || name == 'currentBattle'"
                                >
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
                </template>
            </component>
        </div>
    </Panel>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { contentsStore } from "@renderer/store/contents.store";
import { router } from "@renderer/router";
import { mapsStore, downloadMap } from "@renderer/store/maps.store";
import StandardLobby from "@renderer/components/lobbies/standard.vue";
import FFALobby from "@renderer/components/lobbies/ffa.vue";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import Playerlist from "@renderer/components/battle/Playerlist.vue";
import ChatPanel from "@renderer/components/common/ChatPanel.vue";
import TerrainIcon from "@renderer/components/maps/filters/TerrainIcon.vue";
import personIcon from "@iconify-icons/mdi/person-multiple";
import gridIcon from "@iconify-icons/mdi/grid";
import { Icon } from "@iconify/vue";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { battleStore } from "@renderer/store/battle.store";
import { settingsStore } from "@renderer/store/settings.store";
import pencilIcon from "@iconify-icons/mdi/pencil";
import arrowBackIcon from "@iconify-icons/mdi/arrow-back";
import { StartPosType } from "@main/game/battle/battle-types";
import { db } from "@renderer/store/db";
import { useDexieLiveQuery } from "@renderer/composables/useDexieLiveQuery";
import { useTypedI18n } from "@renderer/i18n";
import Select from "@renderer/components/controls/Select.vue";
import HostBattle from "@renderer/components/battle/HostBattle.vue";
import VotePanel from "@renderer/components/battle/VotePanel.vue";
import { useLobbyMap } from "@renderer/composables/useLobbyMap";
import { resolveLobbyArrangement } from "@renderer/utils/lobby-startboxes";

const editLobbyModalIsOpen = ref(false);

const switchTemplate = ref(false);

function switchLobbyTemplate() {
    switchTemplate.value = !switchTemplate.value;
}
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

function goBack() {
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

const { t } = useTypedI18n();

const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());

const gameListOptions = computed(() => {
    return Array.from(gameStore.availableGameVersions.values());
});

const map = useLobbyMap();

const mapOptions = computed(() => ({
    startPosType: StartPosType.Boxes,
    customStartBoxes: lobbyStore.activeLobby
        ? Object.keys(lobbyStore.activeLobby.allyTeamConfig)
              .sort((a, b) => Number(a) - Number(b))
              .map((key) => lobbyStore.activeLobby!.allyTeamConfig[key].startBox)
        : [],
}));

const arrangement = computed(() => {
    const activeLobby = lobbyStore.activeLobby;
    if (!activeLobby) return undefined;

    return resolveLobbyArrangement(activeLobby.startboxes, Object.keys(activeLobby.allyTeamConfig).length);
});

async function onGameSelected(gameVersion: string) {
    if (battleStore.isOnline) return; //This should be disabled unless we can change versions later, but just in case we also disable it.
    //FIXME: why do we have both 'gameStore.selectedGameVersion' as well as 'battleStore.battleOptions.gameVersion'??
    //It looks like it's because in offline battles we select from available versions?
    //gameStore.selectedGameVersion = await db.gameVersions.get(gameVersion);
    gameStore.selectedGameVersion = gameStore.availableGameVersions.get(gameVersion);
    battleStore.battleOptions.gameVersion = gameVersion;
}
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
.options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
}
.lobby-body {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
}
.title {
    font-size: 28px;
    line-height: 1.2em;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow-x: hidden;
    overflow-y: visible;
    scrollbar-width: none;
}
</style>
