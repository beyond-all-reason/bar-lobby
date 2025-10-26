<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.components.battle.updateBattle.title')" width="400px" @open="onOpen" @close="onClose" ref="updateLobbyModal">
        <div class="flex-col gap-md">
            <template v-if="waitingForBattleCreation">
                <div class="txt-center">{{ t("lobby.components.battle.hostBattle.settingUp") }}</div>
                <Loader :absolutePosition="false"></Loader>
            </template>
            <template v-else>
                <div class="options">
                    <MapBattlePreview />
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
                </div>
                <div>
                    <Textbox v-model="lobbyName" :label="t('lobby.components.battle.hostBattle.name')"></Textbox>
                    <p>{{ t("lobby.components.battle.hostBattle.startBoxes1") }}</p>
                    <p>{{ t("lobby.components.battle.hostBattle.startBoxes2") }}</p>
                    <p>{{ t("lobby.components.battle.hostBattle.startBoxes3") }}</p>
                    <div class="flex-row gap-sm margin-sm">
                        <p>
                            <b>{{ t("lobby.components.battle.hostBattle.allyTeamCount") }}</b>
                        </p>
                        <input type="number" v-model="allyTeamCount" inputId="maxTeams" />
                    </div>
                    <div class="flex-row gap-sm margin-sm">
                        <p>
                            <b>{{ t("lobby.components.battle.hostBattle.teamsPerAllyTeam") }}</b>
                        </p>
                        <input type="number" v-model="playersPerAllyTeam" inputId="playerPerTeam" />
                    </div>
                    <div class="flex-row gap-md">
                        <Select
                            v-model="map"
                            :options="mapListOptions"
                            data-key="springName"
                            :label="t('lobby.views.watch.replays.map')"
                            optionLabel="springName"
                            :filter="true"
                            class="fullwidth"
                            @update:model-value="onMapSelected"
                        ></Select>
                        <Button v-tooltip.left="t('lobby.components.battle.mapOptionsModal.openMapSelector')" @click="openMapList">
                            <Icon :icon="listIcon" height="23" />
                        </Button>
                        <Button v-tooltip.left="t('lobby.components.battle.mapOptionsModal.mapOptionsTitle')" @click="openMapOptions">
                            <Icon :icon="cogIcon" height="23" />
                        </Button>
                        <MapListModal
                            v-model="mapListOpen"
                            :title="t('lobby.components.battle.offlineBattleComponent.maps')"
                            @map-selected="onMapSelected"
                        />
                        <MapOptionsModal v-if="map" v-model="mapOptionsOpen" />
                    </div>
                    <div class="flex-row margin-top-md">
                        <Button class="red fullwidth margin-right-md" @click="onClose">{{ t("lobby.components.prompts.cancel") }}</Button>
                        <Button class="blue fullwidth margin-left-md" @click="updateBattle">{{
                            t("lobby.components.battle.hostBattle.updateButton")
                        }}</Button>
                    </div>
                </div>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref, useTemplateRef } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import Loader from "@renderer/components/common/Loader.vue";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { LobbyCreateRequestData, StartBox, LobbyUpdateRequestData } from "tachyon-protocol/types";
import { MapData } from "@main/content/maps/map-data";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { db } from "@renderer/store/db";
import { useDexieLiveQuery } from "@renderer/composables/useDexieLiveQuery";
import MapListModal from "@renderer/components/battle/MapListModal.vue";
import MapOptionsModal from "@renderer/components/battle/MapOptionsModal.vue";
import { Icon } from "@iconify/vue";
import listIcon from "@iconify-icons/mdi/format-list-bulleted";
import cogIcon from "@iconify-icons/mdi/cog";
import TerrainIcon from "@renderer/components/maps/filters/TerrainIcon.vue";
import personIcon from "@iconify-icons/mdi/person-multiple";
import gridIcon from "@iconify-icons/mdi/grid";
import { battleStore, battleActions } from "@renderer/store/battle.store";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";

const { t } = useTypedI18n();

let lobbyName = "";
let allyTeamCount = 2;
let playersPerAllyTeam = 1;
const map = ref();
const updateLobbyModal = useTemplateRef("updateLobbyModal");
const hostedBattleData: Ref<{ name: string; password: string } | undefined> = ref();
const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());
const waitingForBattleCreation = ref(false);
const mapListOpen = ref(false);
const mapOptionsOpen = ref(false);

function getGeneratedLobbyRequestData(): LobbyCreateRequestData {
    const arr = battleActions.getCurrentStartBoxes(); //Proxy objects causing issues with arrays here, so we just get the boxes manually
    const boxes: Array<StartBox> = []; //FIXME: We can have the wrong number of boxes.
    arr.forEach((item) => {
        boxes.push({
            left: item.left,
            right: item.right,
            top: item.top,
            bottom: item.bottom,
        });
    });
    let config: LobbyCreateRequestData = {
        name: lobbyName,
        mapName: map.value.springName,
        allyTeamConfig: [],
    };
    for (let i = 0; i < allyTeamCount; i++) {
        if (!boxes[i]) {
            //Insufficient startboxes provided, so we just add a full-size one as a hack for now.
            boxes.push({ top: 0, bottom: 1, left: 0, right: 1 });
        }
        config.allyTeamConfig.push({
            maxTeams: playersPerAllyTeam,
            startBox: boxes[i],
            teams: [],
        });
        for (let j = 0; j < playersPerAllyTeam; j++) {
            config.allyTeamConfig[i].teams.push({ maxPlayers: 1 }); //One player by team by default.
        }
    }
    console.log("Generated new lobby config: ", config);
    return config;
}

async function onOpen() {
    //We have to assign options to all necessary battle states to get the right settings to update.
    waitingForBattleCreation.value = false;
    map.value = await db.maps.get(lobbyStore.activeLobby!.mapName);
    lobbyName = lobbyStore.activeLobby ? lobbyStore.activeLobby?.name : "";
    allyTeamCount = lobbyStore.activeLobby?.allyTeams ? Object.keys(lobbyStore.activeLobby?.allyTeams).length : 2;
    playersPerAllyTeam = lobbyStore.activeLobby
        ? lobbyStore.activeLobby!.allyTeams[Object.keys(lobbyStore.activeLobby.allyTeams)[0]].maxTeams
        : 1; //currently always same for all teams.
    return;
}

function onClose() {
    resetBattleSettings();
    hostedBattleData.value = undefined;
    if (updateLobbyModal.value) updateLobbyModal.value.close();
}

function resetBattleSettings() {}

function updateBattle() {
    const data = getGeneratedLobbyRequestData() as LobbyUpdateRequestData;
    if (data.name === lobbyStore.activeLobby!.name) {
        delete data.name;
    }
    if (data.mapName === lobbyStore.activeLobby!.mapName) {
        delete data.mapName;
    }
    lobby.requestLobbyUpdate(data);
    if (updateLobbyModal.value) updateLobbyModal.value.close();
}

function onMapSelected(mapData: MapData) {
    battleStore.battleOptions.map = mapData;
    battleActions.getCurrentStartBoxes();
    map.value = mapData;
    mapListOpen.value = false;
}

function openMapList() {
    mapListOpen.value = true;
}

function openMapOptions() {
    mapOptionsOpen.value = true;
}
</script>

<style lang="scss" scoped>
.options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    width: 400px;
}
</style>
