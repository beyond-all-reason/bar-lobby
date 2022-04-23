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
            <!-- <Select v-model="selectedGame" label="Game" :options="games" close-on-select clear-on-select searchable /> -->
            <!-- <Select v-model="selectedEngine" label="Engine" :options="engines" close-on-select clear-on-select searchable /> -->
            <div>Engine Version</div>
            <div>Game Version</div>
            <div>Game End Condition</div>
            <div class="flex-row flex-bottom gap-md">
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

const battleTitle = ref("Offline Custom Battle");

const battle = window.api.battle;

const installedMaps = computed(() => Object.values(window.api.content.maps.installedMaps));

// const startPosType = ref(BattleTypes.StartPosType.Fixed);
// const startBoxes = ref([] as BattleTypes.StartBox[]);
// startBoxes.value = [
//     { xPercent: 0, yPercent: 0, widthPercent: 1, heightPercent: 0.25 },
//     { xPercent: 0, yPercent: 0.75, widthPercent: 1, heightPercent: 0.25 },
// ];

const games = computed(() => window.api.content.game.installedVersions.map(rapidVersion => rapidVersion.version.fullString).slice(-10));
const selectedGame = ref(lastInArray(games.value));

const engines = computed(() => window.api.content.engine.installedVersions);
const selectedEngine = ref(lastInArray(engines.value));

const start = async () => {
    const engine: EngineVersionFormat = "BAR-105.1.1-814-g9774f22";

    window.api.game.launch(engine, battle);
};
</script>