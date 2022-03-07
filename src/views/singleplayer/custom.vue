<route lang="json">{ "meta": { "title": "Custom", "order": 2, "offline": true, "transition": { "name": "slide-left" } } }</route>

<template>
    <Battle :battle="battle" />
</template>

<script lang="ts" setup>
import { BattleTypes } from "@/model/battle";
import { onMounted, reactive } from "vue";
import Battle from "@/components/battle/Battle.vue";
import { aiNames } from "@/config/ai-names";
import { lastInArray, randomFromArray } from "jaz-ts-utils";

const playerName = window.api.session.model.user?.name ?? "Player";

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
                    name: randomFromArray(aiNames),
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
    battle.hostOptions.engineVersion = lastInArray(window.api.content.engine.installedVersions);
    battle.hostOptions.gameVersion = lastInArray(window.api.content.game.installedVersions).version.fullString; // TODO
});
</script>