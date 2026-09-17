<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal
        :title="
            props.mode === 'update' ? t('lobby.components.battle.hostBattle.updateButton') : t('lobby.components.battle.hostBattle.title')
        "
        width="80vw"
        @open="onOpen"
        @close="onClose"
        ref="hostLobbyModal"
    >
        <div class="flex-col gap-md">
            <template v-if="waitingForBattleCreation">
                <div class="txt-center">{{ t("lobby.components.battle.hostBattle.settingUp") }}</div>
                <Loader :absolutePosition="false" />
            </template>
            <template v-else>
                <div class="host-layout">
                    <div class="host-left">
                        <div class="options">
                            <MapBattlePreview :map="draftMap" :map-options="draftMapOptions">
                                <template #boxes="{ boxes }">
                                    <MapBattlePreviewStartBox
                                        v-for="(box, index) in boxes"
                                        :key="`box-${index}`"
                                        :id="index"
                                        :box="box"
                                        @update:box="(updatedBox) => updateBox(index, updatedBox)"
                                    />
                                </template>
                            </MapBattlePreview>
                            <div class="flex-row flex-space-between">
                                <div class="flex-row gap-lg flex-center-items">
                                    <div class="flex-row flex-center-items gap-sm">
                                        <Icon :icon="personIcon" />{{ draftMap?.playerCountMin }} - {{ draftMap?.playerCountMax }}
                                    </div>
                                    <div class="flex-row flex-center-items gap-sm">
                                        <Icon :icon="gridIcon" />{{ draftMap?.mapWidth }} x {{ draftMap?.mapHeight }}
                                    </div>
                                </div>
                                <div class="flex-row flex-justify-end">
                                    <div class="flex-row flex-center-items gap-sm">
                                        <TerrainIcon v-for="terrain in draftMap?.terrain" :terrain="terrain" :key="terrain" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="host-form">
                            <Textbox v-model="lobbyName" :label="t('lobby.components.battle.hostBattle.name')" />
                            <p>{{ t("lobby.components.battle.hostBattle.startBoxes1") }}</p>
                            <p>{{ t("lobby.components.battle.hostBattle.startBoxes2") }}</p>
                            <p>{{ t("lobby.components.battle.hostBattle.startBoxes3") }}</p>
                            <div class="flex-row gap-sm margin-sm">
                                <p>
                                    <b>{{ t("lobby.components.battle.hostBattle.allyTeamCount") }}</b>
                                </p>
                                <input v-model.number="allyTeamCount" type="number" inputId="maxTeams" class="input-number" min="1" />
                            </div>
                            <div class="flex-row gap-sm margin-sm">
                                <p>
                                    <b>{{ t("lobby.components.battle.hostBattle.teamsPerAllyTeam") }}</b>
                                </p>
                                <input
                                    v-model.number="playersPerAllyTeam"
                                    type="number"
                                    inputId="playerPerTeam"
                                    class="input-number"
                                    min="1"
                                />
                            </div>
                            <div class="flex-row gap-md">
                                <Select
                                    v-model="map"
                                    :options="mapListOptions"
                                    data-key="springName"
                                    :label="t('lobby.components.battle.hostBattle.map')"
                                    optionLabel="springName"
                                    :filter="true"
                                    class="fullwidth"
                                    @update:model-value="onMapSelected"
                                />
                                <Button v-tooltip.left="t('lobby.components.battle.mapOptionsModal.openMapSelector')" @click="openMapList">
                                    <Icon :icon="listIcon" height="23" />
                                </Button>
                                <MapListModal
                                    v-model="isMapListOpen"
                                    :title="t('lobby.components.battle.offlineBattleComponent.maps')"
                                    @map-selected="onMapSelected"
                                />
                            </div>
                        </div>
                    </div>
                    <div class="host-options">
                        <div v-if="draftMap?.startboxesSet" class="box-buttons">
                            <Button
                                v-for="(boxSet, index) in draftMap.startboxesSet"
                                :key="index"
                                @click="setPresetStartBoxes(index)"
                                :disabled="draftMapOptions.startBoxesIndex === index"
                            >
                                <span>{{ index + 1 }}</span>
                            </Button>
                        </div>
                        <div class="box-buttons">
                            <Button @click="setCustomStartBoxes(StartBoxOrientation.EastVsWest)">
                                <img src="/src/renderer/assets/images/icons/east-vs-west.png" />
                            </Button>
                            <Button @click="setCustomStartBoxes(StartBoxOrientation.NorthVsSouth)">
                                <img src="/src/renderer/assets/images/icons/north-vs-south.png" />
                            </Button>
                            <Button @click="setCustomStartBoxes(StartBoxOrientation.NortheastVsSouthwest)">
                                <img src="/src/renderer/assets/images/icons/northeast-vs-southwest.png" />
                            </Button>
                            <Button @click="setCustomStartBoxes(StartBoxOrientation.NorthwestVsSoutheast)">
                                <img src="/src/renderer/assets/images/icons/northwest-vs-southeast.png" />
                            </Button>
                        </div>
                        <Range v-model="customBoxRange" :min="5" :max="100" :step="5" :disabled="lastSelectedCustomPresetBoxes === null" />
                        <div v-if="hasCustomStartBoxes" class="ally-team-list flex-col gap-sm">
                            <div v-for="(teamBox, teamBoxId) in teamBoxes" :key="`delete-box-${teamBoxId}`">
                                <Button
                                    :disabled="!canDeleteTeamBox(teamBox)"
                                    :class="{ red: canDeleteTeamBox(teamBox) }"
                                    class="fullwidth"
                                    @click="onRemoveTeam(teamBoxId)"
                                >
                                    <span v-if="canDeleteTeamBox(teamBox)">
                                        {{ t("lobby.components.battle.mapOptionsModal.deleteTeam") }} {{ teamBoxId + 1 }}
                                    </span>
                                    <span v-else>
                                        <Icon :icon="lockOutlineIcon" :inline="true" />
                                        {{ t("lobby.components.battle.mapOptionsModal.team") }} {{ teamBoxId + 1 }}
                                    </span>
                                </Button>
                            </div>
                            <Button class="green fullwidth" @click="onAddTeam">
                                {{ t("lobby.components.battle.mapOptionsModal.addTeam") }}
                            </Button>
                        </div>
                        <Button
                            v-else-if="draftMapOptions.startBoxesIndex !== undefined"
                            class="fullwidth"
                            @click="setCustomBoxesFromPresetBoxes"
                        >
                            {{ t("lobby.components.battle.mapOptionsModal.editPresetTeams") }}
                        </Button>
                        <div v-if="draftMap?.startPos" class="box-buttons">
                            <Button
                                v-for="(teamSet, index) in draftMap.startPos.team"
                                :key="`fixed-${index}`"
                                @click="setFixedStartBoxes(index)"
                                :disabled="draftMapOptions.startPosType === StartPosType.Fixed"
                            >
                                <span>{{ index + 1 }}</span>
                            </Button>
                            <Button @click="setRandomStartBoxes" :disabled="draftMapOptions.startPosType === StartPosType.Random">
                                {{ t("lobby.components.battle.mapOptionsModal.random") }}
                            </Button>
                        </div>
                    </div>
                    <div class="host-footer">
                        <div v-if="props.mode === 'create'" class="flex-row gap-sm">
                            <Checkbox v-model="areBossesEnabled" />
                            <b
                                ><p>{{ t("lobby.components.battle.hostBattle.areBossesEnabled") }}</p></b
                            >
                        </div>
                        <Select
                            v-if="props.mode === 'create'"
                            v-model="selectedRegion"
                            :options="regions"
                            :label="t('lobby.components.battle.hostBattle.region')"
                            optionLabel="name"
                            optionValue="code"
                            class="fullwidth disabled"
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
                        <div v-if="props.mode === 'update' && settingsDraft.conflicts.length > 0" class="conflicts">
                            <div class="conflict-warning">{{ t("lobby.components.battle.hostBattle.conflictWarning") }}</div>
                            <div v-for="conflict in settingsDraft.conflicts" :key="conflict.field" class="conflict">
                                <span>{{ conflictLabel(conflict.field) }}</span>
                                <div class="flex-row gap-sm">
                                    <Button class="red" @click="() => onUseServer(conflict.field)">{{
                                        t("lobby.components.battle.hostBattle.useServer")
                                    }}</Button>
                                    <Button class="blue" @click="() => settingsDraft.keepMine(conflict.field)">{{
                                        t("lobby.components.battle.hostBattle.keepMine")
                                    }}</Button>
                                </div>
                            </div>
                        </div>
                        <Button class="blue" @click="hostBattle" :disabled="!canSubmit">
                            {{
                                props.mode === "update"
                                    ? t("lobby.components.battle.hostBattle.updateButton")
                                    : t("lobby.components.battle.hostBattle.hostButton")
                            }}
                        </Button>
                    </div>
                </div>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, Ref, ref, useTemplateRef, watch } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import Loader from "@renderer/components/common/Loader.vue";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import Range from "@renderer/components/controls/Range.vue";
import Select from "@renderer/components/controls/Select.vue";
import Flag from "@renderer/components/misc/Flag.vue";
import { lobby } from "@renderer/store/lobby.store";
import { rand } from "@vueuse/core";
import { getRandomMap } from "@renderer/store/maps.store";
import { MapData } from "@main/content/maps/map-data";
import { Lobby } from "@renderer/model/lobby";
import Textbox from "@renderer/components/controls/Textbox.vue";
import { db } from "@renderer/store/db";
import { useDexieLiveQuery } from "@renderer/composables/useDexieLiveQuery";
import MapListModal from "@renderer/components/battle/MapListModal.vue";
import { Icon } from "@iconify/vue";
import listIcon from "@iconify-icons/mdi/format-list-bulleted";
import TerrainIcon from "@renderer/components/maps/filters/TerrainIcon.vue";
import personIcon from "@iconify-icons/mdi/person-multiple";
import gridIcon from "@iconify-icons/mdi/grid";
import { battleStore } from "@renderer/store/battle.store";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import MapBattlePreviewStartBox from "@renderer/components/maps/MapBattlePreviewStartBox.vue";
import { createLobbySettingsDraft, useLobbySettingsDraft } from "@renderer/composables/useLobbySettingsDraft";
import { BattleOptions, StartBoxOrientation, StartPosType, Team } from "@main/game/battle/battle-types";
import { getCurrentStartBoxes } from "@renderer/utils/battle-map-options";
import { getBoxes } from "@renderer/utils/start-boxes";
import { StartBox } from "tachyon-protocol/types";
import lockOutlineIcon from "@iconify-icons/mdi/lock-outline";

const { t } = useTypedI18n();
const props = withDefaults(defineProps<{ mode?: "create" | "update"; activeLobby?: Lobby }>(), { mode: "create" });
const regions = ref([
    { name: "Europe", code: "EU" },
    { name: "United States", code: "US" },
    { name: "Australia", code: "AU" },
]);
const defaultLobbyName = "New Lobby " + rand(0, 1000).toString();
const map = ref<MapData>();
const selectedRegion = ref(regions.value[0].code);
const selectedRegionName = computed(() => regions.value.find((region) => region.code === selectedRegion.value)?.name);
const hostLobbyModal = useTemplateRef("hostLobbyModal");
const hostedBattleData: Ref<{ name: string; password: string } | undefined> = ref();
const mapListOptions = useDexieLiveQuery(() => db.maps.toArray());
const waitingForBattleCreation = ref(false);
const isMapListOpen = ref(false);
const canSendHostRequest = ref(false);
const areBossesEnabled = ref(false);
const settingsDraft = useLobbySettingsDraft();
const draft = computed(() => settingsDraft.draft.value);
const lobbyName = computed({
    get: () => draft.value?.name ?? defaultLobbyName,
    set: (value: string) => settingsDraft.updateDraft({ name: value }),
});
const allyTeamCount = computed({
    get: () => draft.value?.allyTeamConfig.length ?? 2,
    set: (value: number) => settingsDraft.setTeamCounts(value, playersPerAllyTeam.value),
});
const playersPerAllyTeam = computed({
    get: () => draft.value?.allyTeamConfig[0]?.maxTeams ?? 1,
    set: (value: number) => settingsDraft.setTeamCounts(allyTeamCount.value, value),
});
const draftMap = computed(() => draft.value?.map);
const draftMapOptions = computed<BattleOptions["mapOptions"]>(() => draft.value?.mapOptions ?? battleStore.battleOptions.mapOptions);
const draftTeams = computed<Team[]>(() => draft.value?.allyTeamConfig.map(() => ({ participants: [] })) ?? []);
const customBoxRange = ref(25);
const lastSelectedCustomPresetBoxes = ref<StartBoxOrientation | null>(null);
const teamBoxes = computed<Array<StartBox & Team>>(() => {
    const boxes = getCurrentStartBoxes(draftMap.value, draftMapOptions.value);
    return boxes.map((box, index) => ({ ...(draftTeams.value[index] ?? { participants: [] }), ...box }));
});
const hasCustomStartBoxes = computed(
    () => draftMapOptions.value.customStartBoxes !== undefined && draftMapOptions.value.startBoxesIndex === undefined
);
const canDeleteTeamBox = (teamBox: StartBox & Team) => teamBoxes.value.length >= 3 && teamBox.participants.length === 0;

watch(customBoxRange, () => {
    if (lastSelectedCustomPresetBoxes.value !== null) setCustomStartBoxes(lastSelectedCustomPresetBoxes.value);
});
const canSubmit = computed(
    () =>
        canSendHostRequest.value &&
        settingsDraft.conflicts.length === 0 &&
        (props.mode === "create" || settingsDraft.dirtyFields.value.size > 0)
);

watch(areBossesEnabled, (enabled) => settingsDraft.updateDraft({ areBossesEnabled: enabled }));
watch(
    () => props.activeLobby,
    async (activeLobby) => {
        if (props.mode !== "update" || !activeLobby || !draft.value) return;
        const latestMap = await db.maps.get(activeLobby.mapName);
        settingsDraft.syncFromLobby(activeLobby, latestMap);
        if (!settingsDraft.conflicts.some((conflict) => conflict.field === "mapName")) {
            map.value = latestMap;
        }
    },
    { deep: true }
);

function conflictLabel(field: "name" | "mapName" | "allyTeamConfig") {
    switch (field) {
        case "name":
            return t("lobby.components.battle.hostBattle.lobbyNameChanged");
        case "mapName":
            return t("lobby.components.battle.hostBattle.mapNameChanged");
        case "allyTeamConfig":
            return t("lobby.components.battle.hostBattle.allyTeamConfigChanged");
    }
}

function onUseServer(field: "name" | "mapName" | "allyTeamConfig") {
    settingsDraft.useServer(field);
    if (field === "mapName") map.value = draft.value?.map;
}

async function hostBattle() {
    if (!draft.value) return;
    if (props.mode === "update" && settingsDraft.dirtyFields.value.size === 0) return;
    if (props.mode === "update") {
        const payload = settingsDraft.updatePayload();
        if (hostLobbyModal.value) hostLobbyModal.value.close();
        lobby.requestLobbyUpdate(payload);
    } else {
        const payload = settingsDraft.createPayload();
        if (hostLobbyModal.value) hostLobbyModal.value.close();
        lobby.requestCreateLobby(payload);
    }
}

async function onOpen() {
    waitingForBattleCreation.value = false;
    const mapData = props.mode === "update" && props.activeLobby ? await db.maps.get(props.activeLobby.mapName) : await getRandomMap();
    if (mapData) {
        map.value = mapData;
        if (props.mode === "update" && props.activeLobby) {
            settingsDraft.openUpdate(props.activeLobby, mapData);
        } else {
            settingsDraft.openCreate(
                createLobbySettingsDraft(
                    lobbyName.value,
                    mapData,
                    battleStore.battleOptions.mapOptions,
                    allyTeamCount.value,
                    playersPerAllyTeam.value,
                    getCurrentStartBoxes(mapData, battleStore.battleOptions.mapOptions),
                    areBossesEnabled.value
                )
            );
        }
        canSendHostRequest.value = true;
    }
    if (props.mode === "update" && props.activeLobby && draft.value) {
        const latestMap = await db.maps.get(props.activeLobby.mapName);
        settingsDraft.syncFromLobby(props.activeLobby, latestMap);
        if (!settingsDraft.conflicts.some((conflict) => conflict.field === "mapName")) {
            map.value = latestMap;
        }
    }
}

function onClose() {
    hostedBattleData.value = undefined;
    settingsDraft.purge();
    canSendHostRequest.value = false;
}

function onMapSelected(mapData: MapData) {
    settingsDraft.setMap(mapData);
    map.value = mapData;
    isMapListOpen.value = false;
    canSendHostRequest.value = true;
}

function onMapOptionsUpdated(mapOptions: BattleOptions["mapOptions"]) {
    settingsDraft.setMapOptions(mapOptions);
}

function onAddTeam() {
    allyTeamCount.value += 1;
}

function onRemoveTeam(teamId: number) {
    settingsDraft.removeAllyTeam(teamId);
}

function updateBox(index: number, box: StartBox) {
    const boxes = getCurrentStartBoxes(draftMap.value, draftMapOptions.value).map((currentBox) => ({ ...currentBox }));
    boxes[index] = { ...box };
    settingsDraft.setCustomStartBoxes(boxes);
}

function setPresetStartBoxes(startBoxIndex: number) {
    lastSelectedCustomPresetBoxes.value = null;
    onMapOptionsUpdated({
        ...draftMapOptions.value,
        fixedPositionsIndex: undefined,
        startPosType: StartPosType.Boxes,
        startBoxesIndex: startBoxIndex,
    });
}

function setCustomStartBoxes(orientation: StartBoxOrientation) {
    lastSelectedCustomPresetBoxes.value = orientation;
    onMapOptionsUpdated({
        ...draftMapOptions.value,
        startBoxesIndex: undefined,
        startPosType: StartPosType.Boxes,
        customStartBoxes: getBoxes(orientation, customBoxRange.value),
    });
}

function setFixedStartBoxes(index: number) {
    lastSelectedCustomPresetBoxes.value = null;
    onMapOptionsUpdated({
        ...draftMapOptions.value,
        startBoxesIndex: undefined,
        startPosType: StartPosType.Fixed,
        fixedPositionsIndex: index,
    });
}

function setRandomStartBoxes() {
    lastSelectedCustomPresetBoxes.value = null;
    onMapOptionsUpdated({
        ...draftMapOptions.value,
        startBoxesIndex: undefined,
        fixedPositionsIndex: undefined,
        startPosType: StartPosType.Random,
    });
}

function setCustomBoxesFromPresetBoxes() {
    if (draftMapOptions.value.startBoxesIndex === undefined) return;
    onMapOptionsUpdated({
        ...draftMapOptions.value,
        startBoxesIndex: undefined,
        customStartBoxes: getCurrentStartBoxes(draftMap.value, draftMapOptions.value),
    });
}

function openMapList() {
    isMapListOpen.value = true;
}
</script>

<style lang="scss" scoped>
.host-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
    gap: 20px;
    width: 100%;
    height: min(70vh, 700px);
    min-width: 0;
    min-height: 0;
    overflow: hidden;
}

.host-left {
    display: contents;
}

.host-options,
.host-footer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    grid-column: 1;
}

.host-form,
.host-options,
.host-footer {
    grid-row: auto;
}

.host-form,
.host-options {
    min-height: 0;
    overflow-y: auto;
    padding-right: 6px;
}

.ally-team-list {
    max-height: 260px;
    overflow-y: auto;
    padding-right: 6px;
}

.host-form {
    grid-row: 1;
}

.host-options {
    grid-row: 2;
}

.host-options {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.options {
    grid-column: 2;
    grid-row: 1 / span 3;
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
    width: 100%;
    min-height: 0;
    overflow: hidden;
    padding-left: 16px;
    border-left: 1px solid rgba(255, 255, 255, 0.12);
}

.options :deep(.map-container) {
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    display: grid;
}

.options :deep(.map) {
    max-width: 100%;
    max-height: 100%;
}

.box-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.box-buttons img {
    display: block;
    max-width: 50px;
    max-height: 50px;
}

.input-number {
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    &:hover {
        background-color: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.2);
    }
}

.conflicts {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border: 1px solid rgba(255, 180, 80, 0.7);
    background-color: rgba(255, 180, 80, 0.12);
}

.conflict-warning {
    font-weight: 600;
}

.conflict {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

@media (max-width: 760px) {
    .host-layout {
        grid-template-columns: 1fr;
        height: auto;
        max-height: 70vh;
        overflow-y: auto;
    }

    .options {
        grid-column: 1;
        grid-row: 1;
        padding-left: 0;
        border-left: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .host-form {
        grid-row: 2;
    }

    .host-options {
        grid-row: 3;
    }
}
</style>
