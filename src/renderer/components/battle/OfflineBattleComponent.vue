<template>
    <div :class="['battle-container', { singleplayer: true }]">
        <div class="header flex-col gap-md">
            <BattleTitleComponent />
        </div>
        <div class="players flex-col gap-md">
            <Playerlist />
        </div>
        <div class="settings flex-col gap-md">
            <MapBattlePreview />
            <div class="flex-row gap-md">
                <Select
                    :modelValue="battleStore.battleOptions.map"
                    :options="mapListOptions"
                    :data-key="'springName'"
                    label="Map"
                    optionLabel="springName"
                    :filter="true"
                    class="fullwidth"
                    @update:model-value="onMapSelected"
                />
                <Button v-tooltip.left="'Open map selector'" @click="openMapList">
                    <Icon :icon="listIcon" height="23" />
                </Button>
                <Button v-tooltip.left="'Configure map options'" @click="openMapOptions">
                    <Icon :icon="cogIcon" height="23" />
                </Button>
                <MapListModal v-model="mapListOpen" title="Maps" @map-selected="onMapSelected" />
                <MapOptionsModal v-if="battleStore.battleOptions.map" v-model="mapOptionsOpen" />
            </div>
            <GameModeComponent />
            <div v-if="settingsStore.devMode">
                <Select
                    :modelValue="battleStore.battleOptions.gameVersion"
                    :options="gameListOptions"
                    optionLabel="gameVersion"
                    optionValue="gameVersion"
                    label="Game"
                    :filter="true"
                    :placeholder="battleStore.battleOptions.gameVersion"
                    @update:model-value="onGameSelected"
                />
            </div>
            <div v-if="settingsStore.devMode">
                <Select
                    :modelValue="battleStore.battleOptions.engineVersion"
                    :options="engineListOptions"
                    optionLabel="id"
                    optionValue="id"
                    label="Engine"
                    :filter="true"
                    :placeholder="battleStore.battleOptions.engineVersion"
                    class="fullwidth"
                    @update:model-value="onEngineSelected"
                />
            </div>
            <div class="flex-row flex-bottom gap-md">
                <DownloadContentButton
                    v-if="map"
                    :map="map"
                    class="fullwidth green"
                    :disabled="gameStore.isGameRunning"
                    @click="battleActions.startBattle"
                    >Start</DownloadContentButton
                >
                <Button v-else class="fullwidth green" disabled>Start</Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { gameStore } from "@renderer/store/game.store";
import BattleTitleComponent from "@renderer/components/battle/BattleTitleComponent.vue";
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
import { useDexieLiveQuery, useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import { MapData } from "@main/content/maps/map-data";
import { settingsStore } from "@renderer/store/settings.store";
import GameModeComponent from "@renderer/components/battle/GameModeComponent.vue";

const mapListOpen = ref(false);
const mapOptionsOpen = ref(false);
const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());
const gameListOptions = useDexieLiveQuery(() => db.gameVersions.toArray());
const engineListOptions = useDexieLiveQuery(() => db.engineVersions.toArray());

const map = useDexieLiveQueryWithDeps([() => battleStore.battleOptions.map], () => {
    if (!battleStore.battleOptions.map) return null;
    return db.maps.get(battleStore.battleOptions.map.springName);
});

function openMapList() {
    mapListOpen.value = true;
}

function openMapOptions() {
    mapOptionsOpen.value = true;
}

function onEngineSelected(engineVersion: string) {
    battleStore.battleOptions.engineVersion = engineVersion;
}

function onGameSelected(gameVersion: string) {
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
    display: grid;
    grid-template-columns: 1fr 1fr 450px;
    grid-template-rows: auto 1fr;
    gap: 10px;
    grid-template-areas:
        "header header settings"
        "players chat settings";
    &.singleplayer {
        grid-template-areas:
            "header header settings"
            "players players settings";
    }
}

.header {
    grid-area: header;
}

.settings {
    grid-area: settings;
}

.players {
    grid-area: players;
}

.chat {
    grid-area: chat;
}

.title {
    font-size: 30px;
    line-height: 1.2;
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
