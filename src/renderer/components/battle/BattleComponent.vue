<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="battle-container">
		<div v-if="online" :title="tachyonStore.activeLobby?.name" class="flex flex-row">
			<p class="title flex-left">{{ tachyonStore.activeLobby?.name }}</p>
			<div><Button disabled title="Edit Lobby Name"><Icon :icon="pencilIcon" class="flex-right" width="24px" height="24px"/></Button></div>
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
                        label="Map"
                        optionLabel="springName"
                        :filter="true"
                        class="fullwidth"
                        @update:model-value="onMapSelected"
                        :disabled="online"
                    />
                    <Button v-tooltip.left="'Open map selector'" @click="online ? null : openMapList()">
                        <Icon :icon="listIcon" height="23" />
                    </Button>
                    <Button v-tooltip.left="'Configure map options'" @click="online ? null : openMapOptions()">
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
                        label="Game"
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
                        label="Engine"
                        :filter="true"
                        class="fullwidth"
                        :disabled="online"
                    />
                </div>
                <div class="flex-row flex-bottom gap-md flex-grow">
                    <div class="fullwidth" v-if="map">
                        <Button v-if="gameStore.status === GameStatus.LOADING" class="fullwidth grey flex-grow" disabled
                            >Game is starting...</Button
                        >
                        <Button v-else-if="gameStore.status === GameStatus.RUNNING" class="fullwidth grey flex-grow" disabled
                            >Game is running</Button
                        >
                        <DownloadContentButton v-else :map="map" @click="online ? tachyon.startBattle() : battleActions.startBattle()"
                            >Start the game</DownloadContentButton
                        >
                    </div>
                    <Button v-else class="fullwidth green flex-grow" disabled>Start the game</Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
/*TODO: As part of converting this to work for online lobbies, we need to check any assumptions present in sub-components
 * If they assume an offline battle, we need to make them aware of the online status
 * A few are mitigated right now by simply disabling (since there are no changes to certain things in Tachyon right now) when online.
 * The PlayerList component, however, needs to send Tachyon team request updates, adding AI, etc, once that exists in the protocol.
 * And it also needs to receive updates to the organization directly from the activeLobby details.
 */
import { ref, defineProps } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import Playerlist from "@renderer/components/battle/Playerlist.vue";
import Select from "@renderer/components/controls/Select.vue";
import { Icon } from "@iconify/vue";
import MapListModal from "@renderer/components/battle/MapListModal.vue";
import MapOptionsModal from "@renderer/components/battle/MapOptionsModal.vue";
import { battleActions, battleStore } from "@renderer/store/battle.store";
import Button from "@renderer/components/controls/Button.vue";

const { t } = useTypedI18n();
import { db } from "@renderer/store/db";
import listIcon from "@iconify-icons/mdi/format-list-bulleted";
import cogIcon from "@iconify-icons/mdi/cog";
import pencilIcon from "@iconify-icons/mdi/pencil"
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
import { tachyon, tachyonStore } from "@renderer/store/tachyon.store";

const mapListOpen = ref(false);
const mapOptionsOpen = ref(false);
const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());
const gameListOptions = useDexieLiveQuery(() => db.gameVersions.toArray());
const props = defineProps<{
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
