<template>
    <div class="battle">
        <div class="battle__left">
            <Playerlist :players="players" />
        </div>
        <div class="battle__right">
            <MapPreview :filename="selectedMap" />
            <Select :options="maps" v-model="selectedMap" :label-by="(map: MapData) => map.friendlyName" :value-by="(map: MapData) => map.fileNameWithExt" :close-on-select="true"></Select>
            <Button @click="start">Start</Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { EngineTagFormat } from "@/model/formats";
import { Player } from "@/model/battle";
import { MapData } from "@/model/map";
import { Script } from "start-script-converter";
import { Ref, ref } from "vue";
import Button from "@/components/inputs/Button.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Select from "../inputs/Select.vue";
import Playerlist from "@/components/battle/Playerlist.vue";

// const engineVersion = ref("");
// const gameVersion = ref("");

// onMounted(async () => {
//     engineVersion.value = (await window.api.content.get()).version;
//     gameVersion.value = (await window.api.content.getLatestVersionInfo()).version;
// });

const props = defineProps({
    players: Array as () => Player[]
});

const cachedMaps = window.api.content.getMaps();
const maps: Ref<MapData[]> = ref(Object.values(cachedMaps));
const selectedMap = ref(maps.value[0].fileNameWithExt);

const start = async () => {
    const { version } = await window.api.content.getLatestVersionInfo();

    const script: Script = {
        game: {
            gametype: "Beyond All Reason test-17602-f1f76f9",
            ishost: 1,
            myplayername: "fish",
            mapname: "Red Comet Remake 1.7"
        },
        players: [
            {
                id: 0,
                name: "fish",
                team: 0
            }
        ],
        teams: [
            {
                id: 0,
                allyteam: 0,
                teamleader: 0
            }
        ],
        allyteams: [
            {
                id: 0,
                numallies: 0
            }
        ]
    };

    const engine: EngineTagFormat = "BAR-105.1.1-814-g9774f22";

    window.api.game.launch(engine, script);
};
</script>