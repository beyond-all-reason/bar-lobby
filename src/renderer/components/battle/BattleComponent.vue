<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="battle-container">
        <div v-if="online" :title="lobbyStore.activeLobby?.name" class="flex flex-row">
            <div class="flex flex-row fullwidth">
                <Button
                    v-tooltip.bottom="t('lobby.library.maps.back')"
                    class="icon red close flex-left"
                    @click="leaveConfirmModalIsOpen = true"
                >
                    <Icon :icon="arrow_back" :height="24" />{{ t("lobby.components.battle.offlineBattleComponent.exitLobby") }}
                </Button>
                <LeaveConfirmModal v-model="leaveConfirmModalIsOpen" @cancel-leave="cancelLeaveLobby" @confirm-leave="leaveLobby" />
                <p class="title flex-left padding-left-md padding-right-md">{{ lobbyStore.activeLobby?.name }}</p>
                <div>
                    <Button disabled :title="t('lobby.components.battle.offlineBattleComponent.editLobbyName')"
                        ><Icon :icon="pencilIcon" class="flex-right" width="24px" height="24px"
                    /></Button>
                </div>
            </div>
        </div>
        <div class="main-content">
            <div class="player-list">
                <Playerlist />
            </div>
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
                <div class="flex-row gap-md">
                    <Select
                        :modelValue="battleStore.battleOptions.map"
                        :options="mapListOptions"
                        data-key="springName"
                        :label="t('lobby.views.watch.replays.map')"
                        optionLabel="springName"
                        :filter="true"
                        class="fullwidth"
                        @update:model-value="onMapSelected"
                        :disabled="online"
                    />
                    <Button
                        v-tooltip.left="t('lobby.components.battle.mapOptionsModal.openMapSelector')"
                        @click="online ? null : openMapList()"
                    >
                        <Icon :icon="listIcon" height="23" />
                    </Button>
                    <Button
                        v-tooltip.left="t('lobby.components.battle.mapOptionsModal.mapOptionsTitle')"
                        @click="online ? null : openMapOptions()"
                    >
                        <Icon :icon="cogIcon" height="23" />
                    </Button>
                    <MapListModal
                        v-model="mapListOpen"
                        :title="t('lobby.components.battle.offlineBattleComponent.maps')"
                        @map-selected="onMapSelected"
                    />
                    <MapOptionsModal v-if="battleStore.battleOptions.map" v-model="mapOptionsOpen" />
                </div>
                <GameModeComponent />
                <div v-if="settingsStore.devMode">
                    <Select
                        :modelValue="battleStore.battleOptions.gameVersion"
                        :options="gameListOptions"
                        optionLabel="gameVersion"
                        optionValue="gameVersion"
                        :label="t('lobby.components.battle.offlineBattleComponent.gameVersion')"
                        :filter="true"
                        :placeholder="battleStore.battleOptions.gameVersion"
                        @update:model-value="onGameSelected"
                        :disabled="online"
                    />
                </div>
                <div v-if="settingsStore.devMode">
                    <Select
                        :modelValue="enginesStore.selectedEngineVersion"
                        @update:model-value="(engine) => (enginesStore.selectedEngineVersion = engine)"
                        :options="enginesStore.availableEngineVersions"
                        data-key="id"
                        optionLabel="id"
                        :label="t('lobby.components.battle.offlineBattleComponent.engineVersion')"
                        :filter="true"
                        class="fullwidth"
                        :disabled="online"
                    />
                </div>
                <div class="flex-row flex-bottom gap-md flex-grow">
                    <div class="fullwidth" v-if="map">
                        <Button v-if="gameStore.status === GameStatus.LOADING" class="fullwidth grey flex-grow" disabled>{{
                            t("lobby.views.watch.replays.launching")
                        }}</Button>
                        <Button v-else-if="gameStore.status === GameStatus.RUNNING" class="fullwidth grey flex-grow" disabled>{{
                            t("lobby.views.watch.replays.gameIsRunning")
                        }}</Button>
                        <DownloadContentButton
                            v-else
                            :map="map"
                            @click="online ? lobby.requestStartBattle() : battleActions.startBattle()"
                            >{{ t("lobby.components.battle.offlineBattleComponent.startTheGame") }}</DownloadContentButton
                        >
                    </div>
                    <Button v-else class="fullwidth green flex-grow" disabled>{{
                        t("lobby.components.battle.offlineBattleComponent.startTheGame")
                    }}</Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import Playerlist from "@renderer/components/battle/Playerlist.vue";
import Select from "@renderer/components/controls/Select.vue";
import { Icon } from "@iconify/vue";
import MapListModal from "@renderer/components/battle/MapListModal.vue";
import MapOptionsModal from "@renderer/components/battle/MapOptionsModal.vue";
import { battleActions, battleStore } from "@renderer/store/battle.store";
import Button from "@renderer/components/controls/Button.vue";
import { db } from "@renderer/store/db";
import listIcon from "@iconify-icons/mdi/format-list-bulleted";
import cogIcon from "@iconify-icons/mdi/cog";
import pencilIcon from "@iconify-icons/mdi/pencil";
import arrow_back from "@iconify-icons/mdi/arrow-back";
import { useDexieLiveQuery, useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import { MapData } from "@main/content/maps/map-data";
import { settingsStore } from "@renderer/store/settings.store";
import GameModeComponent from "@renderer/components/battle/GameModeComponent.vue";
import { GameStatus, gameStore } from "@renderer/store/game.store";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import { enginesStore } from "@renderer/store/engine.store";
import TerrainIcon from "@renderer/components/maps/filters/TerrainIcon.vue";
import personIcon from "@iconify-icons/mdi/person-multiple";
import gridIcon from "@iconify-icons/mdi/grid";
import LeaveConfirmModal from "@renderer/components/battle/LeaveConfirmModal.vue";
import { lobbyStore, lobby } from "@renderer/store/lobby.store";

const { t } = useTypedI18n();

const mapListOpen = ref(false);
const mapOptionsOpen = ref(false);
const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());
const gameListOptions = useDexieLiveQuery(() => db.gameVersions.toArray());
const leaveConfirmModalIsOpen = ref(false);

defineProps<{
    online: boolean;
}>();

const map = useDexieLiveQueryWithDeps([() => battleStore.battleOptions.map], () => {
    if (!battleStore.battleOptions.map) return;
    return db.maps.get(battleStore.battleOptions.map.springName);
});

function openMapList() {
    mapListOpen.value = true;
}

function openMapOptions() {
    mapOptionsOpen.value = true;
}

function leaveLobby() {
    leaveConfirmModalIsOpen.value = false;
    lobby.leaveLobby();
}
function cancelLeaveLobby() {
    leaveConfirmModalIsOpen.value = false;
}

async function onGameSelected(gameVersion: string) {
    if (battleStore.isOnline) return; //This should be disabled unless we can change versions later, but just in case we also disable it.
    //FIXME: why do we have both 'gameStore.selectedGameVersion' as well as 'battleStore.battleOptions.gameVersion'??
    //It looks like it's because in offline battles we select from available versions?
    gameStore.selectedGameVersion = await db.gameVersions.get(gameVersion);
    battleStore.battleOptions.gameVersion = gameVersion;
}

function onMapSelected(map: MapData) {
    battleStore.battleOptions.map = map;
    mapListOpen.value = false;
}
</script>

<style lang="scss" scoped>
.battle-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.title {
    font-size: 24px;
    line-height: 1.2em;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow-x: hidden;
    overflow-y: visible;
    scrollbar-width: none;
}
.player-list {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
    height: 100%;
}
.options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    width: 400px;
}
.main-content {
    display: flex;
    flex-direction: row;
    gap: 10px;
    height: 100%;
}
.footer {
    display: flex;
    flex-direction: row;
    gap: 10px;
}

.edit-title {
    padding: 5px;
    color: rgba(255, 255, 255, 0.5);
    &:hover {
        color: #fff;
    }
}

.subtitle {
    font-size: 16px;
}

.checkbox {
    margin-right: 10px;
}
</style>
