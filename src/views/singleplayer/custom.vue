<route>{ "meta": { "title": "Custom", "order": 2, "offline": true } }</route>

<template>
    <div>
        <suspense>
            <Battle :battle="battle" />
        </suspense>
    </div>
</template>

<script lang="ts" setup>
import { api } from "@/api/api";
import Battle from "@/components/battle/Battle.vue";
import { BattleType, Faction } from "@/model/battle";

const playerName = api.session.model.account?.value?.name ?? "Player";

const battle: BattleType = {
    battleOptions: {
        gameVersion: (await api.content.game.getLatestGameVersionInfo()).version,
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
};
</script>