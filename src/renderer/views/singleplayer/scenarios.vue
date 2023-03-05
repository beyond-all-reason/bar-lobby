<route lang="json5">
{ meta: { title: "Scenarios", order: 1, transition: { name: "slide-left" } } }
</route>

<template>
    <div class="flex-col fullheight">
        <h1>{{ route.meta.title }}</h1>

        <div class="flex-row gap-lg fullheight">
            <div class="fullwidth flex-col">
                <div class="scroll-container">
                    <div class="scenarios">
                        <ScenarioTile
                            v-for="(scenario, i) in scenarios"
                            :key="i"
                            :scenario="scenario"
                            :class="{ selected: selectedScenario.scenarioid === scenario.scenarioid }"
                            @click="selectedScenario = scenario"
                        />
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
                    <Select v-model="selectedFaction" label="Faction" :options="factions" />
                    <Select v-model="selectedDifficulty" label="Difficulty" :options="difficulties" optionLabel="name" />
                    <Button class="green" @click="launch">Launch</Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import Markdown from "vue3-markdown-it";

import Button from "@/components/controls/Button.vue";
import Select from "@/components/controls/Select.vue";
import ScenarioTile from "@/components/misc/ScenarioTile.vue";
import { defaultGameVersion } from "@/config/default-versions";
import { Scenario } from "@/model/scenario";

const route = api.router.currentRoute.value;
const scenarios = await api.content.game.getScenarios();
const selectedScenario = ref<Scenario>(scenarios[0]);

const difficulties = computed(() => selectedScenario.value.difficulties);
const selectedDifficulty = ref(difficulties.value.find((dif) => dif.name === selectedScenario.value.defaultdifficulty));

const factions = computed(() => selectedScenario.value.allowedsides);
const selectedFaction = ref(factions.value[0]);

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
    const scenarioOptionsStr = Buffer.from(JSON.stringify(scenarioOptions)).toString("base64");

    let restrictionsStr = "";
    let restrictionCount = 0;
    for (const [unitId, limit] of Object.entries(selectedScenario.value.unitlimits)) {
        restrictionsStr += `unit${restrictionCount}=${unitId};\nlimit${restrictionCount}=${limit};\n`;
        restrictionCount++;
    }

    const script = selectedScenario.value.startscript
        .replaceAll("__SCENARIOOPTIONS__", scenarioOptionsStr)
        .replaceAll("__PLAYERNAME__", api.session.onlineUser.username)
        .replaceAll("__BARVERSION__", defaultGameVersion)
        .replaceAll("__MAPNAME__", selectedScenario.value.mapfilename)
        .replaceAll("__PLAYERSIDE__", selectedFaction.value)
        .replaceAll("__ENEMYHANDICAP__", selectedDifficulty.value?.enemyhandicap?.toString() ?? "0")
        .replaceAll("__PLAYERHANDICAP__", selectedDifficulty.value?.playerhandicap?.toString() ?? "0")
        .replaceAll("__RESTRICTEDUNITS__", restrictionsStr)
        .replaceAll("__NUMRESTRICTIONS__", restrictionCount.toString());

    await api.game.launch(script);
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
</style>
