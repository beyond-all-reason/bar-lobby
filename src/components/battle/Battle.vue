<template>
    <div class="battle">
        <div class="battle__left">
            <h1>{{ battleTitle }}</h1>
            <Playerlist :allyTeams="battle.allyTeams" :spectators="battle.spectators"/>
        </div>
        <div class="battle__right flex-col gap-md">
            <MapPreview :filename="mapFile" />
            <Select :options="maps" v-model="mapFile" :label-by="(map: any) => map.friendlyName" :value-by="(map: any) => map.fileNameWithExt" :close-on-select="true" :clear-on-select="true" :searchable="true"></Select>
            <div class="flex-row gap-md">
                <Button @click="addAi">Add AI</Button>
                <AddAIModal @add-ai="addAi" />

                <Button @click="start">Start</Button>
            </div>
            <div>Engine: {{ battle.hostOptions.engineVersion }}</div>
            <div>Game: {{ battle.hostOptions.gameVersion }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from "vue";
import { BattleTypes } from "@/model/battle";
import Button from "@/components/inputs/Button.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Select from "@/components/inputs/Select.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import AddAIModal from "@/components/battle/AddAIModal.vue";
import { EngineTagFormat } from "@/model/formats";
import { randomFromArray } from "jaz-ts-utils";
import { aiNames } from "@/config/ai-names";

const props = defineProps<{
    battle: BattleTypes.Battle;
}>();

const battle = (window as any).battle = reactive(props.battle);

const battleTitle = ref("Offline Custom Battle");

const maps = computed(() => Object.values(window.api.content.maps.getMaps()));
const map = window.api.content.maps.getMapByScriptName(battle.hostOptions.mapName);
const mapFile = ref(map!.fileNameWithExt!);

const addAiModal = () => window.api.modals.open("add-ai");

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
    const engine: EngineTagFormat = "BAR-105.1.1-814-g9774f22";

    window.api.game.launch(engine, battle);
};
</script>