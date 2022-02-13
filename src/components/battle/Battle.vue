<template>
    <div class="battle">
        <div class="battle__left">
            <Playerlist :allyTeams="battle.allyTeams" :spectators="battle.spectators"/>
        </div>
        <div class="battle__right flex-col gap-md">
            <MapPreview :filename="map" />
            <Select :options="maps" v-model="map" :label-by="(map: MapData) => map.friendlyName" :value-by="(map: MapData) => map.fileNameWithExt" :close-on-select="true" :clear-on-select="true" :searchable="true"></Select>
            <div class="flex-row gap-md">
                <Button @click="addAiModal">Add AI</Button>
                <AddAIModal @add-ai="addAi" />

                <Button @click="start">Start</Button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";
import { BattleType } from "@/model/battle";
import { MapData } from "@/model/map-data";
import Button from "@/components/inputs/Button.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Select from "@/components/inputs/Select.vue";
import Playerlist from "@/components/battle/Playerlist.vue";
import AddAIModal from "@/components/battle/AddAIModal.vue";
import { AI } from "@/model/ai";

// const engineVersion = ref("");
// const gameVersion = ref("");

// onMounted(async () => {
//     engineVersion.value = (await window.api.content.get()).version;
//     gameVersion.value = (await window.api.content.getLatestVersionInfo()).version;
// });

// const props = defineProps<{ battle: Battle }>({
//     battle: {
//         type: Object as () => Battle,
//         required: true,
//         default: {

//         }
//     }
// });
const props = defineProps<{
    battle: BattleType
}>();

const cachedMaps = window.api.content.maps.getMaps();
const maps: Ref<MapData[]> = ref(Object.values(cachedMaps));
const map = ref(maps.value[0].fileNameWithExt);

const addAiModal = () => window.api.modals.open("add-ai");

const addAi = (ai: AI) => {
    console.log(ai);
};

const start = async () => {
    //
};

// const start = async () => {
//     const { version } = await window.api.content.getLatestVersionInfo();

//     const script: Script = {
//         game: {
//             gametype: "Beyond All Reason test-17602-f1f76f9",
//             ishost: 1,
//             myplayername: "fish",
//             mapname: "Red Comet Remake 1.7"
//         },
//         players: [
//             {
//                 id: 0,
//                 name: "fish",
//                 team: 0
//             }
//         ],
//         teams: [
//             {
//                 id: 0,
//                 allyteam: 0,
//                 teamleader: 0
//             }
//         ],
//         allyteams: [
//             {
//                 id: 0,
//                 numallies: 0
//             }
//         ]
//     };

//     const engine: EngineTagFormat = "BAR-105.1.1-814-g9774f22";

//     window.api.game.launch(engine, script);
// };
</script>