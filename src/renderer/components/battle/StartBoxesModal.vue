<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal ref="modal" :title="t('lobby.components.battle.startBoxesModal.title')" @open="onOpen">
        <div class="container">
            <div class="map-preview-container">
                <EditableMapBattlePreview
                    v-if="override"
                    :map="map"
                    :map-options="overrideMapOptions"
                    @update:map-options="onBoxesEdited"
                />
                <MapBattlePreview v-else :map="map" :map-options="boxesMapOptions" :arrangement="mapDefaultArrangement" />
            </div>
            <div class="options flex-col gap-md">
                <div class="box-buttons">
                    <Button :disabled="!override" @click="useMapDefault">{{
                        t("lobby.components.battle.startBoxesModal.mapDefault")
                    }}</Button>
                    <Button :disabled="!canEditAsRectangles" @click="editAsRectangles">
                        {{ t("lobby.components.battle.startBoxesModal.editAsRectangles") }}
                    </Button>
                </div>
                <div v-if="map?.startboxesSet?.length">
                    <h4>{{ t("lobby.components.battle.mapOptionsModal.boxesPresets") }}</h4>
                    <div class="box-buttons">
                        <Button v-for="(preset, i) in map.startboxesSet" :key="i" @click="usePreset(preset)">
                            <span>{{ i + 1 }}</span>
                        </Button>
                    </div>
                </div>
                <div class="flex-col gap-sm">
                    <h4>{{ t("lobby.components.battle.mapOptionsModal.customBoxes") }}</h4>
                    <div class="box-buttons">
                        <Button @click="useOrientation(StartBoxOrientation.EastVsWest)">
                            <img src="/src/renderer/assets/images/icons/east-vs-west.png" />
                        </Button>
                        <Button @click="useOrientation(StartBoxOrientation.NorthVsSouth)">
                            <img src="/src/renderer/assets/images/icons/north-vs-south.png" />
                        </Button>
                        <Button @click="useOrientation(StartBoxOrientation.NortheastVsSouthwest)">
                            <img src="/src/renderer/assets/images/icons/northeast-vs-southwest.png" />
                        </Button>
                        <Button @click="useOrientation(StartBoxOrientation.NorthwestVsSoutheast)">
                            <img src="/src/renderer/assets/images/icons/northwest-vs-southeast.png" />
                        </Button>
                    </div>
                    <Range v-model="orientationRange" :min="5" :max="100" :step="5" :disabled="lastOrientation === null" />
                </div>
                <StartboxOverrideInput v-if="settingsStore.devMode" @apply="usePastedOverride" />
                <div class="actions flex-row gap-sm">
                    <Button class="fullwidth" @click="close">{{ t("lobby.components.battle.startBoxesModal.cancel") }}</Button>
                    <Button class="green fullwidth" :disabled="!isChanged" @click="apply">{{
                        t("lobby.components.battle.startBoxesModal.apply")
                    }}</Button>
                </div>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { MapData } from "@main/content/maps/map-data";
import { BattleOptions, StartBoxOrientation, StartPosType } from "@main/game/battle/battle-types";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Range from "@renderer/components/controls/Range.vue";
import EditableMapBattlePreview from "@renderer/components/maps/EditableMapBattlePreview.vue";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import StartboxOverrideInput from "@renderer/components/maps/StartboxOverrideInput.vue";
import { resizeBoxes } from "@renderer/composables/useLobbySettingsDraft";
import { useTypedI18n } from "@renderer/i18n";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { settingsStore } from "@renderer/store/settings.store";
import { withStartboxOverride } from "@renderer/utils/battle-map-options";
import { resolveLobbyArrangement, startboxOverrideUpdate } from "@renderer/utils/lobby-startboxes";
import { getBoxes } from "@renderer/utils/start-boxes";
import { customStartboxOverride, hasPolygon, polyToStartBox, rectsToArrangement, StartboxArrangement } from "@shared/startbox-modoptions";

const { t } = useTypedI18n();

defineProps<{
    map?: MapData;
}>();

const modal = ref<InstanceType<typeof Modal> | null>(null);
const override = ref<StartboxArrangement | null>(null);
const initialOverride = ref("null");
const orientationRange = ref(25);
const lastOrientation = ref<StartBoxOrientation | null>(null);

const boxesMapOptions = { startPosType: StartPosType.Boxes };
const allyTeamCount = computed(() => Object.keys(lobbyStore.activeLobby?.allyTeamConfig ?? {}).length);
const mapDefaultArrangement = computed(
    () => resolveLobbyArrangement({ set: lobbyStore.activeLobby?.startboxes?.set }, allyTeamCount.value) ?? { startboxes: [] }
);
const overrideMapOptions = computed<BattleOptions["mapOptions"]>(() =>
    withStartboxOverride(boxesMapOptions, override.value ?? { startboxes: [] })
);
const shownArrangement = computed(() => override.value ?? mapDefaultArrangement.value);
const canEditAsRectangles = computed(() => !override.value || hasPolygon(override.value));
const isChanged = computed(() => JSON.stringify(override.value) !== initialOverride.value);

watch(orientationRange, () => {
    if (lastOrientation.value !== null) useOrientation(lastOrientation.value);
});

// Lobby and map data are reactive proxies, which structuredClone refuses.
function copy<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

function onOpen() {
    const current = lobbyStore.activeLobby?.startboxes?.override;
    override.value = current ? copy(current) : null;
    initialOverride.value = JSON.stringify(override.value);
    lastOrientation.value = null;
}

function setOverride(next: StartboxArrangement | null) {
    lastOrientation.value = null;
    override.value = next;
}

function useMapDefault() {
    setOverride(null);
}

function editAsRectangles() {
    setOverride(rectsToArrangement(shownArrangement.value.startboxes.map((box) => polyToStartBox(box.poly))));
}

function usePreset(preset: StartboxArrangement) {
    setOverride({ startboxes: copy(preset.startboxes) });
}

function usePastedOverride(pasted: StartboxArrangement) {
    setOverride(pasted);
}

function useOrientation(orientation: StartBoxOrientation) {
    override.value = rectsToArrangement(resizeBoxes(getBoxes(orientation, orientationRange.value), allyTeamCount.value));
    lastOrientation.value = orientation;
}

function onBoxesEdited(mapOptions: BattleOptions["mapOptions"]) {
    setOverride(customStartboxOverride(mapOptions.customStartBoxes, mapOptions.customStartBoxShapes) ?? null);
}

async function apply() {
    lobby.requestLobbyUpdate(await startboxOverrideUpdate(override.value));
    close();
}

function close() {
    modal.value?.close();
}
</script>

<style lang="scss" scoped>
.container {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.6fr);
    gap: 20px;
    width: min(80vw, 1000px);
    height: min(70vh, 700px);
}

.map-preview-container {
    display: flex;
    min-height: 0;
}

.map-preview-container :deep(.map-container) {
    flex: 1 1 0;
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
}

.options {
    overflow-y: auto;
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

.actions {
    margin-top: auto;
}
</style>
