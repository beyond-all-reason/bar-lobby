<route>{ "meta": { "title": "Custom", "order": 2, "offline": true } }</route>

<template>
    <div>
        <Battle :battle="battle" />
    </div>
</template>

<script lang="ts" setup>
import { BattleType, Faction } from "@/model/battle";
import { onMounted, reactive } from "vue";
import Battle from "@/components/battle/Battle.vue";

const playerName = window.api.session.model.account?.value?.name ?? "Player";

const battle: BattleType = reactive({
    battleOptions: {
        gameVersion: "",
        isHost: true,
        mapName: "Red Comet Remake 1.8",
        myPlayerName: playerName
    },
    allyTeams: [
        {
            teams: [{
                players: [{
                    name: playerName
                }]
            }]
        },
        {
            teams: [{
                players: [{
                    name: "AI",
                    aiType: "barb",
                    faction: Faction.Armada
                }]
            }]
        }
    ]
});

onMounted(async () => {
    battle.battleOptions.gameVersion = (await window.api.content.game.getLatestGameVersionInfo()).version;
});

</script>