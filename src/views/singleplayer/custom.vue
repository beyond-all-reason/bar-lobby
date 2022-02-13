<route>{ "meta": { "title": "Custom", "order": 2, "offline": true } }</route>

<template>
    <div>
        <Battle :battle="battle" />
    </div>
</template>

<script lang="ts" setup>
import { BattleTypes } from "@/model/battle";
import { onMounted, reactive } from "vue";
import Battle from "@/components/battle/Battle.vue";

const playerName = window.api.session.model.account?.value?.name ?? "Player";

const defaultBattleL: BattleTypes.Battle = {
    hostOptions: {
        engineVersion: "BAR-105.1.1-814-g9774f22",
        gameVersion: "Beyond All Reason test-17602-f1f76f9",
        isHost: true,
        mapName: "Red Comet Remake 1.8",
        myPlayerName: playerName
    },
    allyTeams: [
        {
            teams: [{
                players: [{
                    name: playerName
                }],
                ais: []
            }]
        },
        {
            teams: [{
                players: [],
                ais: [{
                    name: "Jimmy",
                    ownerName: playerName,
                    ai: "BARb",
                    faction: BattleTypes.Faction.Armada
                }]
            }]
        }
    ],
    spectators: []
};

const battle: BattleTypes.Battle = reactive(defaultBattleL);

onMounted(async () => {
    battle.hostOptions.engineVersion = await window.api.content.engine.getLatestInstalledEngineVersion();
    battle.hostOptions.gameVersion = (await window.api.content.game.getLatestGameVersionInfo()).version; // TODO
});
</script>