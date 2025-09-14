<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.components.battle.hostBattle.title')" width="400px" @open="onOpen" @close="onClose" ref="hostLobbyModal">
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
                    <Textbox v-model="lobbyName" label="Name"></Textbox>
                    <p>Startboxes are assigned sequentially to teams.</p>
                    <p>Extra startboxes will be dropped.</p>
                    <p>AllyTeams without one are full-map startboxes.</p>
                    <div class="flex-row gap-sm margin-sm">
                        <p><b>AllyTeam Count: </b></p>
                        <input type="number" v-model="maxTeams" inputId="maxTeams" />
                    </div>
                    <div class="flex-row gap-sm margin-sm">
                        <p><b>Teams per AllyTeam: </b></p>
                        <input type="number" v-model="playersPerAllyTeam" inputId="playerPerTeam" />
                    </div>
                    <div class="flex-row gap-md">
                        <Select
                            v-model="map"
                            :options="mapListOptions"
                            data-key="springName"
                            label="Map"
                            optionLabel="springName"
                            :filter="true"
                            class="fullwidth"
                            @update:model-value="onMapSelected"
                        ></Select>
                        <Button v-tooltip.left="'Open map selector'" @click="openMapList">
                            <Icon :icon="listIcon" height="23" />
                        </Button>
                        <Button v-tooltip.left="'Configure map options'" @click="openMapOptions">
                            <Icon :icon="cogIcon" height="23" />
                        </Button>
                        <MapListModal
                            v-model="mapListOpen"
                            :title="t('lobby.components.battle.offlineBattleComponent.maps')"
                            @map-selected="onMapSelected"
                        />
                        <MapOptionsModal v-if="map" v-model="mapOptionsOpen" />
                    </div>
                </div>
                <Select
                    v-model="selectedRegion"
                    :options="regions"
                    :label="t('lobby.components.battle.hostBattle.region')"
                    optionLabel="name"
                    optionValue="code"
                    class="fullwidth"
                >
                    <template #value>
                        <div class="flex-row gap-md">
                            <Flag :countryCode="selectedRegion" />
                            <div>{{ selectedRegionName }}</div>
                        </div>
                    </template>

                    <template #option="slotProps">
                        <div class="flex-row gap-md">
                            <Flag :countryCode="slotProps.option.code" />
                            <div>{{ slotProps.option.name }}</div>
                        </div>
                    </template>
                </Select>
                <Button class="blue" @click="hostBattle()">{{ t("lobby.components.battle.hostBattle.hostButton") }}</Button>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, Ref, ref, useTemplateRef } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import Loader from "@renderer/components/common/Loader.vue";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import Flag from "@renderer/components/misc/Flag.vue";
import { tachyon, tachyonStore } from "@renderer/store/tachyon.store";
import { LobbyCreateRequestData, StartBox } from "tachyon-protocol/types";
import { rand } from "@vueuse/core";
import { getRandomMap, mapsStore } from "@renderer/store/maps.store";
import { MapData } from "@main/content/maps/map-data";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { db } from "@renderer/store/db";
import { useDexieLiveQuery, useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
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

const regions = ref([
    { name: "Europe", code: "EU" },
    { name: "United States", code: "US" },
    { name: "Australia", code: "AU" },
]);
const lobbyName = ref("New Lobby " + rand(0, 1000).toString());
const maxTeams = ref(2);
const playersPerAllyTeam = ref(1);
const map = ref();
const selectedRegion = ref(regions.value[0].code);
const selectedRegionName = computed(() => regions.value.find((r) => r.code === selectedRegion.value)?.name);
const hostLobbyModal = useTemplateRef("hostLobbyModal");
const hostedBattleData: Ref<{ name: string; password: string } | undefined> = ref();
const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());
const waitingForBattleCreation = ref(false);
const mapListOpen = ref(false);
const mapOptionsOpen = ref(false);

async function getGeneratedLobbyRequestData(): Promise<LobbyCreateRequestData> {
    const boxes = battleActions.getCurrentStartBoxes(); //FIXME: We can have the wrong number of boxes.
    const temp: any[] = [];
    let config = {
        name: lobbyName.value,
        mapName: map.value.springName,
        allyTeamConfig: Array.from(temp),
    };
    for (let i = 0; i < maxTeams.value; i++) {
        if (!boxes[i]) {
            //Insufficient startboxes provided, so we just add a full-size one as a hack.
            boxes.push({ top: 0, bottom: 1, left: 0, right: 1 });
        }
        let allyConfig = {
            maxTeams: playersPerAllyTeam.value,
            startBox: boxes[i],
            teams: Array.from(temp),
        };
        config.allyTeamConfig.push(allyConfig);
        for (let j = 0; j < playersPerAllyTeam.value; j++) {
            config.allyTeamConfig[i]["teams"].push({ maxPlayers: 1 }); //One player by team by default.
        }
    }
    console.log(config);
    return config;
}

async function hostBattle() {
    getGeneratedLobbyRequestData().then((data) => {
        //waitingForBattleCreation.value = true;
        hostLobbyModal.value!.close();
        tachyon.createLobby(data);
        //Need some kind of response here to handle errors in the modal and also to close it once successful.
    });
}

async function onOpen() {
    waitingForBattleCreation.value = false;
    await getRandomMap().then((mapData) => {
        if (mapData) {
            map.value = mapData;
            battleStore.battleOptions.map = mapData;
        }
    });
}

function onClose() {
    hostedBattleData.value = undefined;
}

function onMapSelected(mapData: MapData) {
    //We will hijack the "battlestore" so the map stuff works easier
    battleStore.battleOptions.map = mapData;
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
