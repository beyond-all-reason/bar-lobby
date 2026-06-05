<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal ref="modal" :title="t('lobby.components.battle.mapOptionsModal.mapOptionsTitle')">
        <div class="container">
            <div class="map-preview-container">
                <MapBattlePreview />
            </div>
            <div class="options flex-col gap-md">
                <div v-if="battleStore.battleOptions.map?.startboxesSet">
                    <h4>{{ t("lobby.components.battle.mapOptionsModal.boxesPresets") }}</h4>
                    <div class="box-buttons">
                        <Button
                            v-for="(boxSet, i) in battleStore.battleOptions.map.startboxesSet"
                            :key="i"
                            @click="() => setPresetStartBoxes(i)"
                            :disabled="battleStore.battleOptions.mapOptions.startBoxesIndex === i"
                        >
                            <span>{{ i + 1 }}</span>
                        </Button>
                    </div>
                </div>
                <div class="flex-col gap-sm">
                    <h4>{{ t("lobby.components.battle.mapOptionsModal.customBoxes") }}</h4>
                    <div class="box-buttons">
                        <Button @click="() => setCustomStartBoxes(StartBoxOrientation.EastVsWest)">
                            <img src="/src/renderer/assets/images/icons/east-vs-west.png" />
                        </Button>
                        <Button @click="() => setCustomStartBoxes(StartBoxOrientation.NorthVsSouth)">
                            <img src="/src/renderer/assets/images/icons/north-vs-south.png" />
                        </Button>
                        <Button @click="() => setCustomStartBoxes(StartBoxOrientation.NortheastVsSouthwest)">
                            <img src="/src/renderer/assets/images/icons/northeast-vs-southwest.png" />
                        </Button>
                        <Button @click="() => setCustomStartBoxes(StartBoxOrientation.NorthwestVsSoutheast)">
                            <img src="/src/renderer/assets/images/icons/northwest-vs-southeast.png" />
                        </Button>
                    </div>

                    <div class="box-buttons">
                        <Range v-model="customBoxRange" :min="5" :max="100" :step="5" :disabled="lastSelectedCustomPresetBoxes === null" />
                    </div>
                </div>
                <div v-if="hasCustomStartBoxes">
                    <div v-for="(teamBox, teamBoxId) in teamBoxes" :key="`delete-box-${teamBoxId}`">
                        <Button
                            :disabled="!canDeleteTeamBox(teamBox)"
                            :class="{ red: canDeleteTeamBox(teamBox) }"
                            class="fullwidth"
                            @click="() => battleActions.removeTeam(teamBoxId)"
                        >
                            <span v-if="canDeleteTeamBox(teamBox)"
                                >{{ t("lobby.components.battle.mapOptionsModal.deleteTeam") }} {{ teamBoxId + 1 }}</span
                            >
                            <span v-else>
                                <Icon :icon="lockOutlineIcon" :inline="true"></Icon>
                                {{ t("lobby.components.battle.mapOptionsModal.team") }} {{ teamBoxId + 1 }} (<template
                                    v-if="participantCounts[teamBoxId] != undefined"
                                >
                                    <span v-if="participantCounts[teamBoxId].playerCount > 0">
                                        {{ participantCounts[teamBoxId].playerCount }}
                                        {{
                                            pluralize(
                                                t("lobby.components.battle.mapOptionsModal.player"),
                                                participantCounts[teamBoxId].playerCount || 0
                                            )
                                        }}
                                    </span>
                                    <span v-if="participantCounts[teamBoxId].botCount > 0 && participantCounts[teamBoxId].playerCount > 0"
                                        >&nbsp;-&nbsp;</span
                                    >
                                    <span v-if="participantCounts[teamBoxId].botCount > 0">
                                        {{ participantCounts[teamBoxId].botCount }}
                                        {{
                                            pluralize(
                                                t("lobby.components.battle.mapOptionsModal.ai"),
                                                participantCounts[teamBoxId].botCount || 0
                                            )
                                        }}
                                    </span> </template
                                >)
                            </span>
                        </Button>
                    </div>

                    <Button class="green fullwidth" @click="() => battleActions.addTeam()">{{
                        t("lobby.components.battle.mapOptionsModal.addTeam")
                    }}</Button>
                </div>
                <div v-else>
                    <div>
                        <Button class="fullwidth" @click="setCustomBoxesFromPresetBoxes">{{
                            t("lobby.components.battle.mapOptionsModal.editPresetTeams")
                        }}</Button>
                    </div>
                </div>
                <div v-if="battleStore.battleOptions.map?.startPos">
                    <h4>{{ t("lobby.components.battle.mapOptionsModal.fixedPositions") }}</h4>
                    <div class="box-buttons">
                        <Button
                            v-for="(teamSet, i) in battleStore.battleOptions.map.startPos?.team"
                            :key="`team${i}`"
                            @click="() => setFixedStartBoxes(i)"
                            :disabled="battleStore.battleOptions.mapOptions.startPosType === StartPosType.Fixed"
                        >
                            <span>{{ i + 1 }}</span>
                        </Button>
                        <Button
                            @click="setRandomStartBoxes"
                            :disabled="battleStore.battleOptions.mapOptions.startPosType === StartPosType.Random"
                        >
                            <span>{{ t("lobby.components.battle.mapOptionsModal.random") }}</span>
                        </Button>
                    </div>
                </div>
                <div class="actions">
                    <Button class="green fullwidth" @click="close">{{ t("lobby.components.battle.mapOptionsModal.close") }}</Button>
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
import { isPlayer, StartBoxOrientation, StartPosType, Team } from "@main/game/battle/battle-types";
import MapBattlePreview from "@renderer/components/maps/MapBattlePreview.vue";
import { getBoxes } from "@renderer/utils/start-boxes";
import { StartBox } from "tachyon-protocol/types";
import { pluralize } from "@renderer/utils/i18n";
import { Icon } from "@iconify/vue";
import lockOutlineIcon from "@iconify-icons/mdi/lock-outline";
import { useTypedI18n } from "@renderer/i18n";
const { t } = useTypedI18n();

const modal: Ref<null | InstanceType<typeof Modal>> = ref(null);

const customBoxRange = ref(25);

watch(
    () => battleStore.battleOptions.map,
    () => {
        customBoxRange.value = 25;
    }
);

// merged boxes with teams for displaying team info
// and team based logic for start boxes
const teamBoxes = computed<Array<StartBox & Team>>(() => {
    const teams = battleStore.teams;
    const boxes = battleActions.getCurrentStartBoxes();

    const teamBoxes: Array<StartBox & Team> = [];

    for (let i = 0; i < teams.length; i++) {
        teamBoxes.push({ ...teams[i], ...boxes[i] });
    }

    return teamBoxes;
});

// get player and bot counts for better ux
const participantCounts = computed(() => {
    return teamBoxes.value.map((teamBox) => {
        const players = teamBox.participants.filter(isPlayer);
        return {
            playerCount: players.length,
            botCount: teamBox.participants.length - players.length,
        };
    });
});

const canDeleteTeamBox = (teamBox: StartBox & Team) => teamBoxes.value.length >= 3 && teamBox.participants.length == 0;

const hasCustomStartBoxes = computed(() => {
    const customStartBoxes = battleStore.battleOptions.mapOptions.customStartBoxes;
    const startBoxesIndex = battleStore.battleOptions.mapOptions.startBoxesIndex;

    if (customStartBoxes == undefined || startBoxesIndex != undefined) return false;

    return true;
});

const lastSelectedCustomPresetBoxes: Ref<StartBoxOrientation | null> = ref(null);

watch(customBoxRange, () => {
    if (lastSelectedCustomPresetBoxes.value === null) return;

    setCustomStartBoxes(lastSelectedCustomPresetBoxes.value);
});

function setPresetStartBoxes(startBoxIndex: number) {
    lastSelectedCustomPresetBoxes.value = null;

    delete battleStore.battleOptions.mapOptions.fixedPositionsIndex;
    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Boxes;
    battleStore.battleOptions.mapOptions.startBoxesIndex = startBoxIndex;
}

function setCustomStartBoxes(orientation: StartBoxOrientation) {
    lastSelectedCustomPresetBoxes.value = orientation;

    const customStartBoxes = getBoxes(orientation, customBoxRange.value);
    delete battleStore.battleOptions.mapOptions.startBoxesIndex;
    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Boxes;
    battleStore.battleOptions.mapOptions.customStartBoxes = customStartBoxes;
}

function setFixedStartBoxes(index: number) {
    lastSelectedCustomPresetBoxes.value = null;

    delete battleStore.battleOptions.mapOptions.startBoxesIndex;
    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Fixed;
    battleStore.battleOptions.mapOptions.fixedPositionsIndex = index;
}
function setRandomStartBoxes() {
    lastSelectedCustomPresetBoxes.value = null;

    delete battleStore.battleOptions.mapOptions.startBoxesIndex;
    delete battleStore.battleOptions.mapOptions.fixedPositionsIndex;
    battleStore.battleOptions.mapOptions.startPosType = StartPosType.Random;
}

function setCustomBoxesFromPresetBoxes() {
    lastSelectedCustomPresetBoxes.value = null;

    const startBoxesIndex = battleStore.battleOptions.mapOptions.startBoxesIndex;

    if (startBoxesIndex == undefined) {
        return;
    }

    const currentStartBoxes = battleActions.getCurrentStartBoxes();

    delete battleStore.battleOptions.mapOptions.startBoxesIndex;
    delete battleStore.battleOptions.mapOptions.customStartBoxes;

    battleStore.battleOptions.mapOptions.customStartBoxes = currentStartBoxes;
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
