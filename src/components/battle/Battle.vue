<template>
    <div class="battle">
        <Button @click="start">Start</Button>
        <MapPreview :filename="selectedMap" />
        <Select :options="maps" v-model="selectedMap" :close-on-select="true"></Select>
    </div>
</template>

<script lang="ts" setup>
import { EngineTagFormat } from "@/model/formats";
import { Script } from "start-script-converter";
import { ref } from "vue";
import Button from "@/components/inputs/Button.vue";
import MapPreview from "@/components/battle/MapPreview.vue";
import Select from "../inputs/Select.vue";

// const engineVersion = ref("");
// const gameVersion = ref("");

// onMounted(async () => {
//     engineVersion.value = (await window.api.content.get()).version;
//     gameVersion.value = (await window.api.content.getLatestVersionInfo()).version;
// });

const maps = ref(["2_mountains_battlefield.sd7", "aberdeen3v3v3.sd7"] as string[]);
const selectedMap = ref("2_mountains_battlefield.sd7");

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