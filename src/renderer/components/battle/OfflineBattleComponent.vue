<template>
    <div class="battle-container">
        <div class="header flex-row flex-space-between flex-center-items">
            <div>
                <h1>{{ battleStore.title }}</h1>
                <!-- <p>Play against the AI in a custom game mode.</p> -->
            </div>
            <AdvancedOptions />
        </div>

        <div class="main-content fullheight">
            <div class="map card padding-md scroll-container">
                <div class="map-title card padding-md flex-row flex-space-between flex-align-center">
                    <h4>{{ battleStore.battleOptions.map?.displayName }}</h4>
                    <Button v-tooltip.left="'Change map'" @click="openMapList">
                        <Icon :icon="arrowDownIcon" height="24" />
                    </Button>
                    <MapListModal v-model="mapListOpen" title="Maps" @map-selected="onMapSelected" />
                </div>

                <div class="card padding-md flex-row flex-space-between flex-align-center" v-if="battleStore.battleOptions.map">
                    <!-- TODO: What info about the map is most important to show here? -->
                    <span><b>Size</b> {{ battleStore.battleOptions.map?.mapWidth }}x{{ battleStore.battleOptions.map?.mapHeight }}</span>
                    <span><b>Max Players</b> {{ battleStore.battleOptions.map?.playerCountMax }}</span>
                </div>

                <div class="card">
                    <MapBattlePreview />
                </div>

                <div class="flex-row gap-md">
                    <Button v-tooltip.left="'Configure map options'" @click="openMapOptions">
                        <Icon :icon="cogIcon" height="23" />
                    </Button>
                    <MapOptionsModal v-if="battleStore.battleOptions.map" v-model="mapOptionsOpen" />
                </div>
            </div>

            <div class="player-list">
                <div class="card padding-md">
                    <GameModeComponent />
                </div>
                <Playerlist />
            </div>
            <div class="options">
                <div class="card padding-md flex-col flex-grow fullheight gap-sm">
                    <SelectedOptions />
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
                </div>
            </div>
        </div>

        <div class="footer card padding-md flex-row flex-bottom gap-md flex-grow">
            <DownloadContentButton
                v-if="map"
                :map="map"
                class="green"
                :disabled="gameStore.isGameRunning"
                @click="battleActions.startBattle"
            >
                Start the game
            </DownloadContentButton>
            <!-- <Button v-else class="fullwidth green flex-grow" disabled>Start the game</Button> -->
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
import arrowDownIcon from "@iconify-icons/mdi/keyboard-arrow-down";
import cogIcon from "@iconify-icons/mdi/cog";
import { useDexieLiveQuery, useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import { MapData } from "@main/content/maps/map-data";
import { settingsStore } from "@renderer/store/settings.store";
import GameModeComponent from "@renderer/components/battle/GameModeComponent.vue";
import { gameStore } from "@renderer/store/game.store";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import AdvancedOptions from "@renderer/components/battle/AdvancedOptions.vue";
import SelectedOptions from "@renderer/components/battle/SelectedOptions.vue";
import { enginesStore } from "@renderer/store/engine.store";

const mapListOpen = ref(false);
const mapOptionsOpen = ref(false);
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

.card {
    background: rgba(0, 0, 0, 0.5);

    > .card {
        background: rgba(0, 0, 0, 0.3);
    }
}

.main-content {
    display: grid;
    grid-template-columns: minmax(450px, 1fr) 2fr 1fr;
    grid-auto-rows: auto;
    flex-direction: row;
    gap: 10px;
    height: 100%;
    min-height: 0;
}

.map {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
}

.map-title {
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.player-list {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 10px;
    height: 100%;
}

.footer {
    display: grid;
    grid-template-columns: minmax(450px, 1fr) 2fr 1fr;
    direction: rtl;
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
