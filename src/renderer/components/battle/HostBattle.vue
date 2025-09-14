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
                <div>
                    <Textbox v-model="lobbyName" label="Name"></Textbox>
                    <div class="flex-row gap-sm">
                        <p><b>AllyTeam Count: </b></p>
                        <input type="number" v-model="maxTeams" inputId="maxTeams" />
                    </div>
                    <div class="flex-row gap-sm">
                        <p><b>Teams per AllyTeam: </b></p>
                        <input type="number" v-model="playersPerAllyTeam" inputId="playerPerTeam" />
                    </div>
                    <Textbox v-model="map" disabled label="Map Name"></Textbox>
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
import { tachyon } from "@renderer/store/tachyon.store";
import { LobbyCreateRequestData, StartBox } from "tachyon-protocol/types";
import { rand } from "@vueuse/core";
import { getRandomMap } from "@renderer/store/maps.store";
import { MapData } from "@main/content/maps/map-data";
import Textbox from "@renderer/components/controls/Textbox.vue";

const { t } = useTypedI18n();

const regions = ref([
    { name: "Europe", code: "EU" },
    { name: "United States", code: "US" },
    { name: "Australia", code: "AU" },
]);
const lobbyName = ref("New Lobby " + rand(0, 1000).toString());
const maxTeams = ref(2);
const playersPerAllyTeam = ref(1);
const map = ref("");
const selectedRegion = ref(regions.value[0].code);
const selectedRegionName = computed(() => regions.value.find((r) => r.code === selectedRegion.value)?.name);
const hostLobbyModal = useTemplateRef("hostLobbyModal");
const hostedBattleData: Ref<{ name: string; password: string } | undefined> = ref();

const waitingForBattleCreation = ref(false);

//FIXME: This is a lot of hardcoded options at the moment
async function getGeneratedLobbyRequestData(): Promise<LobbyCreateRequestData> {
    const temp: any[] = [];
    let config = {
        name: lobbyName.value,
        mapName: map.value,
        allyTeamConfig: Array.from(temp),
    };
    for (let i = 0; i < maxTeams.value; i++) {
        let allyConfig = {
            maxTeams: playersPerAllyTeam.value,
            startBox: { top: 0, bottom: 1, left: 0, right: 1 },
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
        tachyon.createLobby(data);
        hostLobbyModal.value!.close();
        //Need some kind of response here to handle errors in the modal and also to close it once successful.
    });
}

async function onOpen() {
    waitingForBattleCreation.value = false;
    await getRandomMap().then((mapData) => {
        //TODO: Check if this relies on *installed* maps or works with all maps in pool. Alternatively, just let the player pick initially.
        if (mapData) {
            map.value = mapData.springName;
        }
    });
}

function onClose() {
    hostedBattleData.value = undefined;
}
</script>

<style lang="scss" scoped></style>
