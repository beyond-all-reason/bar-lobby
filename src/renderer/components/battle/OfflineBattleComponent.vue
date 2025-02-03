<template>
    <div class="battle-container">
        <div class="main-content">
            <div class="player-list">
                <Playerlist />
            </div>
            <div class="options">
                <MapBattlePreview />
                <div class="flex-row gap-md">
                    <Select
                        :modelValue="battleStore.battleOptions.map"
                        :options="mapListOptions"
                        data-key="springName"
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
                        :modelValue="enginesStore.selectedEngineVersion"
                        @update:model-value="(engine) => (enginesStore.selectedEngineVersion = engine)"
                        :options="enginesStore.availableEngineVersions"
                        data-key="id"
                        optionLabel="id"
                        label="Engine"
                        :filter="true"
                        class="fullwidth"
                    />
                </div>
                <div class="flex-row flex-bottom gap-md flex-grow">
                    <DownloadContentButton
                        v-if="map"
                        :map="map"
                        class="fullwidth green"
                        :disabled="gameStore.isGameRunning"
                        @click="battleActions.startBattle"
                        >Start the game</DownloadContentButton
                    >
                    <Button v-else class="fullwidth green flex-grow" disabled>Start the game</Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
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
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import { MapData } from "@main/content/maps/map-data";
import { settingsStore } from "@renderer/store/settings.store";
import GameModeComponent from "@renderer/components/battle/GameModeComponent.vue";
import { gameStore } from "@renderer/store/game.store";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import { enginesStore } from "@renderer/store/engine.store";

const mapListOpen = ref(false);
const mapOptionsOpen = ref(false);
const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());
const gameListOptions = useDexieLiveQuery(() => db.gameVersions.toArray());

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

async function onGameSelected(gameVersion: string) {
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
    font-size: 30px;
    line-height: 1.2;
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
