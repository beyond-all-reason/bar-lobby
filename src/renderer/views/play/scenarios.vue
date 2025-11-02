<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ meta: { title: "Scenarios", order: 1, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <div class="scenarios-container">
            <div class="view-title">
                <h1>{{ t("lobby.singleplayer.scenarios.title") }}</h1>
                <p>{{ t("lobby.singleplayer.scenarios.description") }}</p>
            </div>
            <Panel class="scenarios-main-panel" noPadding>
                <div class="flex-row gap-lg fullheight">
                    <div class="fullwidth flex-col">
                        <div class="scenarios scroll-container">
                            <TransitionGroup name="fade">
                                <ScenarioTile
                                    v-for="scenario in scenarios"
                                    :key="scenario.title"
                                    :scenario="scenario"
                                    :class="{ selected: selectedScenario.scenarioid === scenario.scenarioid }"
                                    @click="selectedScenario = scenario"
                                />
                            </TransitionGroup>
                        </div>
                    </div>
                    <div class="scenario-preview flex-col gap-md">
                        <h4>{{ selectedScenario.title }}</h4>
                        <div class="scroll-container flex-grow">
                            <Markdown :source="selectedScenario.summary" />
                            <Markdown :source="selectedScenario.briefing" />
                        </div>
                        <div class="gridform">
                            <div>{{ t("lobby.singleplayer.scenarios.victoryCondition") }}</div>
                            <div>{{ selectedScenario.victorycondition }}</div>

                            <div>{{ t("lobby.singleplayer.scenarios.loseCondition") }}</div>
                            <div>{{ selectedScenario.losscondition }}</div>
                        </div>
                        <div>
                            <Select v-model="selectedFaction" :label="t('lobby.singleplayer.scenarios.faction')" :options="factions" />
                        </div>
                        <div>
                            <Select
                                v-model="selectedDifficulty"
                                :label="t('lobby.singleplayer.scenarios.difficulty')"
                                :options="difficulties"
                                optionLabel="name"
                            />
                        </div>
                        <DownloadContentButton
                            v-if="map"
                            :maps="[map.springName]"
                            :games="gameVersion ? [gameVersion] : []"
                            :engines="enginesStore.selectedEngineVersion ? [enginesStore.selectedEngineVersion.id] : []"
                            class="fullwidth green"
                            :disabled="gameStore.status !== GameStatus.CLOSED"
                            @click="launch"
                            >{{ t("lobby.singleplayer.scenarios.launch") }}</DownloadContentButton
                        >
                        <Button v-else class="fullwidth green" disabled>{{ t("lobby.singleplayer.scenarios.launch") }}</Button>
                    </div>
                </div>
            </Panel>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import ScenarioTile from "@renderer/components/misc/ScenarioTile.vue";
import { Scenario } from "@main/content/game/scenario";
import { LATEST_GAME_VERSION } from "@main/config/default-versions";
import Panel from "@renderer/components/common/Panel.vue";
import { db } from "@renderer/store/db";
import { MapDownloadData } from "@main/content/maps/map-data";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import Markdown from "@renderer/components/misc/Markdown.vue";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import { GameStatus, gameStore } from "@renderer/store/game.store";

import { useTypedI18n } from "@renderer/i18n";

const { t } = useTypedI18n();

import { enginesStore } from "@renderer/store/engine.store";

const gameVersion = gameStore?.selectedGameVersion?.gameVersion;
const loadedScenarios = gameVersion ? await window.game.getScenarios(gameVersion) : [];
const scenarios = ref<Scenario[]>(loadedScenarios);
const selectedScenario = ref<Scenario>(scenarios.value[0]);

const map = useDexieLiveQueryWithDeps([selectedScenario], async () => {
    let selected = selectedScenario.value;
    if (!selected) return;

    const [live, nonLive] = await Promise.all([db.maps.get(selected.mapfilename), db.nonLiveMaps.get(selected.mapfilename)]);

    let map = live ?? nonLive;

    if (!map) {
        map = {
            springName: selected.mapfilename,
            isDownloading: false,
            isInstalled: false,
        } satisfies MapDownloadData;
    }

    return map;
});

const difficulties = computed(() => selectedScenario.value.difficulties);
const selectedDifficulty = ref(difficulties.value.find((dif) => dif.name === selectedScenario.value.defaultdifficulty));

const factions = computed(() => selectedScenario.value.allowedsides);
const selectedFaction = ref(factions.value[0]);

watch(
    () => gameStore.selectedGameVersion?.gameVersion,
    async (selectedVersion) => {
        const loadedScenarios = selectedVersion ? await window.game.getScenarios(selectedVersion) : [];
        scenarios.value = loadedScenarios;
        selectedScenario.value = scenarios.value[0];
    }
);

watch(selectedScenario, (newScenario) => {
    selectedDifficulty.value = difficulties.value.find((dif) => dif.name === newScenario.defaultdifficulty);
    selectedFaction.value = factions.value[0] ?? "Armada";
});

async function launch() {
    const scenarioOptions = {
        ...selectedScenario.value.scenariooptions,
        version: selectedScenario.value.version,
        difficulty: selectedDifficulty.value,
    };
    const scenarioOptionsStr = btoa(JSON.stringify(scenarioOptions));

    let restrictionsStr = "";
    let restrictionCount = 0;
    for (const [unitId, limit] of Object.entries(selectedScenario.value.unitlimits)) {
        restrictionsStr += `unit${restrictionCount}=${unitId};\nlimit${restrictionCount}=${limit};\n`;
        restrictionCount++;
    }

    const script = selectedScenario.value.startscript
        .replaceAll("__SCENARIOOPTIONS__", scenarioOptionsStr)
        //TODO replace with online name when implemented
        .replaceAll("__PLAYERNAME__", "Player")
        .replaceAll("__BARVERSION__", LATEST_GAME_VERSION)
        .replaceAll("__MAPNAME__", selectedScenario.value.mapfilename)
        .replaceAll("__PLAYERSIDE__", selectedFaction.value)
        .replaceAll("__ENEMYHANDICAP__", selectedDifficulty.value?.enemyhandicap?.toString() ?? "0")
        .replaceAll("__PLAYERHANDICAP__", selectedDifficulty.value?.playerhandicap?.toString() ?? "0")
        .replaceAll("__RESTRICTEDUNITS__", restrictionsStr)
        .replaceAll("__NUMRESTRICTIONS__", restrictionCount.toString());

    if (!enginesStore.selectedEngineVersion) {
        throw new Error("No engine version selected");
    }
    await window.game.launchScript(script, LATEST_GAME_VERSION, enginesStore.selectedEngineVersion.id);
}
</script>

<style lang="scss" scoped>
.scenarios-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    align-self: center;
    width: 1600px;
}

.scenarios-main-panel {
    padding: 30px;
    padding-left: 0;
    padding-bottom: 0;
    height: 100%;
}

.scenarios {
    padding-left: 30px;
    padding-bottom: 30px;
    margin-bottom: 30px;
    width: 100%;
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    padding-right: 10px;
}

.scenario-preview {
    width: 600px;
    height: 100%;
    padding-bottom: 30px;
}

.launch-button {
    flex-grow: 0;
}
</style>
