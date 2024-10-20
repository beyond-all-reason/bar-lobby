<template>
    <div :class="['battle-container', { singleplayer: true }]">
        <div class="header flex-col gap-md">
            <BattleTitleComponent />
        </div>
        <div class="players flex-col gap-md">
            <Playerlist />
        </div>
        <div class="settings flex-col gap-md">
            <!-- <MapPreview
                v-if="map"
                :map="map"
                :startPosType="battleStore.battleOptions.startPosType"
                :startBoxes="battleStore.battleOptions.startBoxes"
            /> -->
            <MapOverviewCard :map="map" friendly-name="" />
            <div class="flex-row gap-md">
                <Select
                    :modelValue="battleStore.battleOptions.mapScriptName"
                    :options="mapListOptions"
                    label="Map"
                    optionLabel="scriptName"
                    optionValue="scriptName"
                    :filter="true"
                    class="fullwidth"
                    :placeholder="battleStore.battleOptions.mapScriptName"
                    @update:model-value="onMapSelected"
                />
                <Button v-tooltip.left="'Open map selector'" @click="openMapList">
                    <Icon :icon="listIcon" height="23" />
                </Button>
                <Button v-tooltip.left="'Configure map options'" @click="openMapOptions">
                    <Icon :icon="cogIcon" height="23" />
                </Button>
                <MapListModal v-model="mapListOpen" title="Maps" @map-selected="onMapSelected" />
                <MapOptionsModal
                    v-if="map"
                    v-model="mapOptionsOpen"
                    title="Map Options"
                    :map="map"
                    :startBoxes="battleStore.battleOptions.startBoxes"
                    :startPosType="battleStore.battleOptions.startPosType"
                    @set-map-options="setMapOptions"
                />
            </div>
            <div class="flex-row gap-md">
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
                <Button v-tooltip.left="'Configure game options'" @click="openGameOptions">
                    <Icon :icon="cogIcon" height="23" />
                </Button>
                <LuaOptionsModal
                    id="game-options"
                    v-model="gameOptionsOpen"
                    :luaOptions="battleStore.battleOptions.gameOptions"
                    :title="`Game Options - ${battleStore.battleOptions.gameVersion}`"
                    :sections="gameOptions"
                    @set-options="setGameOptions"
                />
            </div>
            <div>
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
                <Button class="fullwidth green" :disabled="gameStore.isGameRunning" @click="battleActions.startBattle">Start</Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, Ref, ref, watch } from "vue";
import { getBoxes, StartBoxOrientation } from "@renderer/utils/start-boxes";
import { LuaOptionSection } from "@main/content/game/lua-options";
import { StartPosType } from "@main/game/battle/battle-types";
import { gameStore } from "@renderer/store/game.store";
import BattleTitleComponent from "@renderer/components/battle/BattleTitleComponent.vue";
import Playerlist from "@renderer/components/battle/Playerlist.vue";
import Select from "@renderer/components/controls/Select.vue";
import { Icon } from "@iconify/vue";
import MapListModal from "@renderer/components/battle/MapListModal.vue";
import MapOptionsModal from "@renderer/components/battle/MapOptionsModal.vue";
import LuaOptionsModal from "@renderer/components/battle/LuaOptionsModal.vue";
import { battleActions, battleStore } from "@renderer/store/battle.store";
import Button from "@renderer/components/controls/Button.vue";
import { MapData } from "@main/content/maps/map-data";
import { db } from "@renderer/store/db";
import MapOverviewCard from "@renderer/components/maps/MapOverviewCard.vue";
import listIcon from "@iconify-icons/mdi/format-list-bulleted";
import cogIcon from "@iconify-icons/mdi/cog";
import { useDexieLiveQuery } from "@renderer/composables/useDexieLiveQuery";

const map = ref<MapData>();
watch(
    () => battleStore.battleOptions.mapScriptName,
    async (mapScriptName) => {
        console.log("mapScriptName for this battle", mapScriptName);
        if (!mapScriptName) {
            return;
        }
        map.value = await db.maps.get(mapScriptName);
    }
);

const mapListOpen = ref(false);
const mapOptionsOpen = ref(false);
const gameOptionsOpen = ref(false);
const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());
const gameListOptions = useDexieLiveQuery(() => db.gameVersions.toArray());
const engineListOptions = useDexieLiveQuery(() => db.engineVersions.toArray());

const gameOptions: Ref<LuaOptionSection[]> = ref([]);

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

//TODO this is not working
async function openGameOptions() {
    // TODO: show loader on button (maybe @clickAsync event?)
    gameOptions.value = await window.game.getGameOptions(battleStore.battleOptions.gameVersion);
    gameOptionsOpen.value = true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setGameOptions(options: Record<string, any>) {
    battleStore.battleOptions.gameOptions = options;
}

function setMapOptions(startPosType: StartPosType, orientation: StartBoxOrientation, size: number) {
    battleStore.battleOptions.startPosType = startPosType;
    battleStore.battleOptions.startBoxes = getBoxes(orientation, size);
}

function onMapSelected(mapScriptName: string) {
    mapListOpen.value = false;
    battleStore.battleOptions.mapScriptName = mapScriptName;
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
