<template>
    <div class="battle flex-row flex-grow gap-lg">
        <div class="flex-col flex-grow gap-md">
            <!-- <div class="flex-row flex-grow gap-md"> -->
            <div class="flex-col flex-grow">
                <h1>{{ battleTitle }}</h1>
                <Playerlist />
            </div>
            <!-- <div class="battle__center flex-right">
                    <ModOptions :game-version="selectedGame" />
                </div> -->
            <!-- </div> -->
            <div>
                <BattleChat />
            </div>
        </div>
        <div class="battle__right gap-md">
            <MapPreview />
            <Select v-model="battle.battleOptions.mapFileName" label="Map" :options="installedMaps" :label-by="(map: any) => map.friendlyName" :value-by="(map: any) => map.fileNameWithExt" close-on-select clear-on-select searchable />
            <div class="flex-row gap-md">
                <Options v-model="battle.battleOptions.startPosType" label="Start Pos" required full-width>
                    <Option v-for="option in startPosOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </Option>
                </Options>
                <Options v-model="battle.battleOptions.teamPreset" label="Team Preset" required full-width>
                    <Option v-for="option in teamPresetOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </Option>
                </Options>
            </div>
            <Select v-model="selectedGame" label="Game" :options="games" close-on-select clear-on-select searchable :disabled="!battle.battleOptions.offline" />
            <Select v-model="selectedEngine" label="Engine" :options="engines" close-on-select clear-on-select searchable :disabled="!battle.battleOptions.offline" />
            <div class="flex-row flex-bottom gap-md">
                <Button class="btn--red" fullwidth @click="leave">
                    Leave
                </Button>
                <Button class="btn--green" fullwidth @click="start">
                    Start
                </Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import Button from "@/components/inputs/Button.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Select from "@/components/inputs/Select.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import { lastInArray } from "jaz-ts-utils";
import type { EngineVersionFormat } from "@/model/formats";
import BattleChat from "@/components/battle/BattleChat.vue";
import { StartPosType, TeamPreset } from "@/model/battle/types";
import Options from "@/components/inputs/Options.vue";
import Option from "@/components/inputs/Option.vue";

const battleTitle = ref("Offline Custom Battle");

const battle = api.battle;

const installedMaps = computed(() => Object.values(api.content.maps.installedMaps));

const startPosOptions: Array<{ label: string, value: StartPosType }> = [
    { label: "Fixed", value: StartPosType.Fixed },
    { label: "Boxes", value: StartPosType.ChooseInGame }
];

const teamPresetOptions: Array<{ label: string, value: TeamPreset }> = [
    { label: "Standard", value: TeamPreset.Standard },
    { label: "FFA", value: TeamPreset.FFA },
    { label: "Custom", value: TeamPreset.Custom },
];

const games = computed(() => api.content.game.installedVersions.map(rapidVersion => rapidVersion.version.fullString).slice(-10));
const selectedGame = ref(lastInArray(games.value));

const engines = computed(() => api.content.engine.installedVersions);
const selectedEngine = ref(lastInArray(engines.value));

const leave = () => {
    // TODO
};

const start = async () => {
    const engine: EngineVersionFormat = "BAR-105.1.1-814-g9774f22";

    api.game.launch(engine, battle);
};
</script>