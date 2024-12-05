<route lang="json5">
{ meta: { title: "Scenarios", order: 1, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="view">
        <Panel class="flex-grow">
            <div class="flex-col fullheight">
                <h1>{{ route.meta.title }}</h1>
                <div class="flex-row gap-lg fullheight">
                    <div class="fullwidth flex-col">
                        <div class="scroll-container">
                            <div class="scenarios">
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
                    </div>
                    <div class="flex-col">
                        <div class="scroll-container scenario-preview flex-col gap-md">
                            <h4>{{ selectedScenario.title }}</h4>
                            <Markdown :source="selectedScenario.summary" />
                            <Markdown :source="selectedScenario.briefing" />
                            <div class="gridform">
                                <div>Victory condition</div>
                                <div>{{ selectedScenario.victorycondition }}</div>

                                <div>Lose condition</div>
                                <div>{{ selectedScenario.losscondition }}</div>
                            </div>
                            <div>
                                <Select v-model="selectedFaction" label="Faction" :options="factions" />
                            </div>
                            <div>
                                <Select v-model="selectedDifficulty" label="Difficulty" :options="difficulties" optionLabel="name" />
                            </div>
                            <DownloadContentButton
                                v-if="map"
                                :map="map"
                                class="fullwidth green"
                                :disabled="gameStore.isGameRunning"
                                @click="launch"
                                >Launch</DownloadContentButton
                            >
                            <Button v-else class="fullwidth green" disabled>Launch</Button>
                        </div>
                    </div>
                </div>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import Button from "@renderer/components/controls/Button.vue";
import Select from "@renderer/components/controls/Select.vue";
import ScenarioTile from "@renderer/components/misc/ScenarioTile.vue";
import { useRouter } from "vue-router";
import { Scenario } from "@main/content/game/scenario";
import { LATEST_GAME_VERSION } from "@main/config/default-versions";
import Panel from "@renderer/components/common/Panel.vue";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import Markdown from "@renderer/components/misc/Markdown.vue";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import { gameStore } from "@renderer/store/game.store";

const router = useRouter();
const route = router.currentRoute.value;

const loadedScenarios = await window.game.getScenarios(gameStore.selectedGameVersion.gameVersion);
const scenarios = ref<Scenario[]>(loadedScenarios);
const selectedScenario = ref<Scenario>(scenarios.value[0]);

const map = useDexieLiveQueryWithDeps([selectedScenario], () => db.maps.get(selectedScenario.value?.mapfilename));

const difficulties = computed(() => selectedScenario.value.difficulties);
const selectedDifficulty = ref(difficulties.value.find((dif) => dif.name === selectedScenario.value.defaultdifficulty));

const factions = computed(() => selectedScenario.value.allowedsides);
const selectedFaction = ref(factions.value[0]);

watch(
    () => gameStore.selectedGameVersion.gameVersion,
    async (selectedVersion) => {
        const loadedScenarios = await window.game.getScenarios(selectedVersion);
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

    await window.game.launchScript(script);
}
</script>

<style lang="scss" scoped>
.scenarios {
    width: 100%;
    display: grid;
    grid-gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    padding-right: 10px;
}

.scenario-preview {
    width: 550px;
    padding-right: 10px;
}

.launch-button {
    flex-grow: 0;
}
</style>
