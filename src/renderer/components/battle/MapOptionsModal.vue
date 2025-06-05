<template>
    <Modal ref="modal" title="Map options">
        <div class="container">
            <div class="map-preview-container">
                <MapBattlePreview />
            </div>
            <div class="options flex-col gap-md">
                <div v-if="battleStore.battleOptions.map?.startboxesSet">
                    <h4>Boxes presets</h4>
                    <div class="box-buttons">
                        <Button
                            v-for="(boxSet, i) in battleStore.battleOptions.map.startboxesSet"
                            :key="i"
                            @click="
                                () => {
                                    delete battleStore.battleOptions.mapOptions.fixedPositionsIndex;
                                    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Boxes;
                                    battleStore.battleOptions.mapOptions.startBoxesIndex = i;
                                }
                            "
                            :disabled="battleStore.battleOptions.mapOptions.startBoxesIndex === i"
                        >
                            <span>{{ i + 1 }}</span>
                        </Button>
                    </div>
                </div>
                <div class="flex-col gap-sm">
                    <h4>Custom boxes</h4>
                    <div class="box-buttons">
                        <Button @click="() => setCustomBoxes(StartBoxOrientation.EastVsWest)">
                            <img src="/src/renderer/assets/images/icons/east-vs-west.png" />
                        </Button>
                        <Button @click="() => setCustomBoxes(StartBoxOrientation.NorthVsSouth)">
                            <img src="/src/renderer/assets/images/icons/north-vs-south.png" />
                        </Button>
                        <Button @click="() => setCustomBoxes(StartBoxOrientation.NortheastVsSouthwest)">
                            <img src="/src/renderer/assets/images/icons/northeast-vs-southwest.png" />
                        </Button>
                        <Button @click="() => setCustomBoxes(StartBoxOrientation.NorthwestVsSoutheast)">
                            <img src="/src/renderer/assets/images/icons/northwest-vs-southeast.png" />
                        </Button>
                    </div>
                    <div class="box-buttons">
                        <Range v-model="customBoxRange" :min="5" :max="100" :step="5" />
                    </div>
                </div>
                <div v-if="hasCustomStartBoxes">
                    <div v-for="(box, boxId) in battleStore.battleOptions.mapOptions.customStartBoxes" :key="`delete-box-${boxId}`">
                        <Button class="red fullwidth" @click="() => deleteCustomBox(boxId)">Delete Box {{ boxId + 1 }}</Button>
                    </div>

                    <div>
                        <Button class="green fullwidth" @click="addCustomBox">Add box</Button>
                    </div>
                </div>
                <div v-if="battleStore.battleOptions.map?.startPos">
                    <h4>Fixed positions</h4>
                    <div class="box-buttons">
                        <Button
                            v-for="(teamSet, i) in battleStore.battleOptions.map.startPos?.team"
                            :key="`team${i}`"
                            @click="() => setFixedPositions(i)"
                            :disabled="battleStore.battleOptions.mapOptions.startPosType === StartPosType.Fixed"
                        >
                            <span>{{ i + 1 }}</span>
                        </Button>
                        <Button
                            @click="setRandomPositions"
                            :disabled="battleStore.battleOptions.mapOptions.startPosType === StartPosType.Random"
                        >
                            <span>Random</span>
                        </Button>
                    </div>
                </div>
                <div class="actions">
                    <Button class="green fullwidth" @click="close">Close</Button>
                </div>
            </div>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { Ref, ref, watch, computed } from "vue";

import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import Range from "@renderer/components/controls/Range.vue";
import { battleStore, battleActions } from "@renderer/store/battle.store";
import { StartBoxOrientation, StartPosType } from "@main/game/battle/battle-types";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import { getBoxes } from "@renderer/utils/start-boxes";

const modal: Ref<null | InstanceType<typeof Modal>> = ref(null);

const customBoxRange = ref(25);

watch(
    () => battleStore.battleOptions.map,
    () => {
        customBoxRange.value = 25;
    }
);

const hasCustomStartBoxes = computed(() => {
    const customStartBoxes = battleStore.battleOptions.mapOptions.customStartBoxes;
    const startBoxesIndex = battleStore.battleOptions.mapOptions.startBoxesIndex;

    if (customStartBoxes == undefined || startBoxesIndex != undefined) return false;

    return true;
});

function setCustomBoxes(orientation: StartBoxOrientation) {
    const customStartBoxes = getBoxes(orientation, customBoxRange.value);
    delete battleStore.battleOptions.mapOptions.startBoxesIndex;
    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Boxes;
    battleStore.battleOptions.mapOptions.customStartBoxes = customStartBoxes;
}

function addCustomBox() {
    const customBoxes = battleStore.battleOptions.mapOptions.customStartBoxes;

    if (customBoxes == undefined) return;

    if (customBoxes.length == 0) {
        // Add a default box with proper sizing at the top-left of the map
        const defaultBox = {
            top: 0.0,
            bottom: 1,
            left: 0.0,
            right: customBoxRange.value / 100,
        };
        battleStore.battleOptions.mapOptions.customStartBoxes = [...customBoxes, defaultBox];
    } else {
        const lastBox = customBoxes.at(-1);
        if (lastBox == undefined) return;
        battleStore.battleOptions.mapOptions.customStartBoxes = [...customBoxes, lastBox];
    }

    if (battleStore.teams.length < customBoxes.length + 1) battleActions.addTeam();
}

function deleteCustomBox(boxId: number) {
    const customBoxes = battleStore.battleOptions.mapOptions.customStartBoxes;

    if (customBoxes == undefined || customBoxes.length == 0) return;

    if (customBoxes[boxId]) {
        const newBoxes = customBoxes.filter((_, index) => index !== boxId);
        battleStore.battleOptions.mapOptions.customStartBoxes = newBoxes;
    }

    battleActions.removeTeam(boxId);
}

function setFixedPositions(index: number) {
    delete battleStore.battleOptions.mapOptions.startBoxesIndex;
    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Fixed;
    battleStore.battleOptions.mapOptions.fixedPositionsIndex = index;
}
function setRandomPositions() {
    delete battleStore.battleOptions.mapOptions.startBoxesIndex;
    delete battleStore.battleOptions.mapOptions.fixedPositionsIndex;
    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Random;
}

function close() {
    modal.value?.close();
}
</script>

<style lang="scss" scoped>
.container {
    height: 80vh;
    position: relative;
    display: flex;
    gap: 10px;
}

.map-preview-container {
    aspect-ratio: 1;
}

.box-buttons {
    display: flex;
    flex-direction: row;
    gap: 5px;
    :deep(button) {
        padding: 5px;
        &:hover {
            img {
                opacity: 1;
            }
            span {
                opacity: 1;
            }
        }
    }
    img {
        max-width: 50px;
        image-rendering: pixelated;
        opacity: 0.7;
    }
    span {
        min-width: 50px;
        opacity: 0.7;
        font-size: 2rem;
    }
}

.options {
    width: 100%;
}

.control {
    max-height: 80px;
}

.actions {
    margin-top: auto;
    width: 100%;
}
</style>
