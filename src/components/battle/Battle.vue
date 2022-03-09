<template>
    <div class="battle">
        <div class="battle__left">
            <h1>{{ battleTitle }}</h1>
            <Playerlist :ally-teams="battle.allyTeams" :spectators="battle.spectators" />
            <BattleChat />
        </div>
        <div class="battle__right flex-col gap-md">
            <MapPreview :filename="selectedMap" />
            <Select v-model="selectedMap" label="Map" :options="maps" :label-by="(map: MapData) => map.friendlyName" :value-by="(map: MapData) => map.fileNameWithExt" close-on-select clear-on-select searchable />
            <Select v-model="selectedGame" label="Game" :options="games" close-on-select clear-on-select searchable />
            <Select v-model="selectedEngine" label="Engine" :options="engines" close-on-select clear-on-select searchable />
            <suspense>
                <ModOptions :game-version="selectedGame" />
            </suspense>
            <div class="flex-row gap-md">
                <Button @click="addAiModal">
                    Add AI
                </Button>
                <AddAIModal :engine-version="selectedEngine" @add-ai="addAi" />
                <Button class="btn--green" @click="start">
                    Start
                </Button>
            </div>
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
import AddAIModal from "./AddAIModal.vue";
import { AI } from "@/model/ai";
import ModOptions from "@/components/battle/ModOptions.vue";
import BattleChat from "@/components/battle/BattleChat.vue";

const props = defineProps<{
    battle: BattleTypes.Battle;
}>();

const battle = (window as any).battle = reactive(props.battle);

const battleTitle = ref("Offline Custom Battle");

const maps = computed(() => Object.values(window.api.content.maps.installedMaps));
const map: ComputedRef<MapData | null | undefined> = computed(() => window.api.content.maps.getMapByScriptName(battle.hostOptions.mapName));
const selectedMap = ref(map.value?.fileNameWithExt ?? "");

const games = computed(() => window.api.content.game.installedVersions.map(rapidVersion => rapidVersion.version.fullString).slice(-10));
const selectedGame = ref(lastInArray(games.value));

const engines = computed(() => window.api.content.engine.installedVersions);
const selectedEngine = ref(lastInArray(engines.value));

const addAiModal = () => window.api.modals.open("add-ai");

const addAi = (ai: AI) => {
    const playerName = window.api.session.model.user?.name ?? "Player";

    battle.allyTeams[1].teams.push({
        ais: [{
            name: randomFromArray(aiNames),
            ownerName: playerName,
            ai: ai.interfaceShortName,
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