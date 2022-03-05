<template>
    <div class="battle">
        <div class="battle__left">
            <h1>{{ battleTitle }}</h1>
            <Playerlist :allyTeams="battle.allyTeams" :spectators="battle.spectators"/>
        </div>
        <div class="battle__right flex-col gap-md">
            <MapPreview :filename="selectedMap" />
            <Select label="Map" :options="maps" v-model="selectedMap" :label-by="(map: MapData) => map.friendlyName" :value-by="(map: MapData) => map.fileNameWithExt" close-on-select clear-on-select searchable></Select>
            <Select label="Game" :options="games" v-model="selectedGame" close-on-select clear-on-select searchable></Select>
            <div class="flex-row gap-md">
                <Button @click="addAi">Add AI</Button>
                <!-- <AddAIModal @add-ai="addAi" /> -->

                <Button @click="start" class="btn--green">Start</Button>
            </div>
            <div>Engine: {{ battle.hostOptions.engineVersion }}</div>
            <div>Game: {{ battle.hostOptions.gameVersion }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { ComputedRef} from "vue";
import { computed, reactive, ref } from "vue";
import { BattleTypes } from "@/model/battle";
import Button from "@/components/inputs/Button.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Select from "@/components/inputs/Select.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import { lastInArray, randomFromArray } from "jaz-ts-utils";
import { aiNames } from "@/config/ai-names";
import type { EngineVersionFormat } from "@/model/formats";
import type { MapData } from "@/model/map-data";

const props = defineProps<{
    battle: BattleTypes.Battle;
}>();

const battle = (window as any).battle = reactive(props.battle);

const battleTitle = ref("Offline Custom Battle");

const maps = computed(() => Object.values(window.api.content.maps.installedMaps));
const map: ComputedRef<MapData | null | undefined> = computed(() => window.api.content.maps.getMapByScriptName(battle.hostOptions.mapName));
const selectedMap = ref(map.value?.fileNameWithExt ?? "");

const games = window.api.content.game.installedVersions.map(rapidVersion => rapidVersion.version.fullString).slice(-10);
const visibleGames = games.slice(games.length - 5);
const selectedGame = ref(lastInArray(games));

// const addAiModal = () => window.api.modals.open("add-ai");

const addAi = () => {
    const playerName = window.api.session.model.user?.name ?? "Player";

    battle.allyTeams[1].teams.push({
        ais: [{
            name: randomFromArray(aiNames),
            ownerName: playerName,
            ai: "BARb",
            faction: BattleTypes.Faction.Armada
        }],
        players: []
    });
};

const start = async () => {
    const engine: EngineVersionFormat = "BAR-105.1.1-814-g9774f22";

    window.api.game.launch(engine, battle);
};
</script>