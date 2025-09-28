<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <BattlePreview :battle="convertLobbyToBattle(lobby)"></BattlePreview>
</template>

<script setup lang="ts">
import BattlePreview from "@renderer/components/battle/BattlePreview.vue";
import { OngoingBattle } from "@main/content/replays/replay";
import { LobbyOverview } from "tachyon-protocol/types";

defineProps<{
    lobby: LobbyOverview;
}>();

function convertLobbyToBattle(lobby: LobbyOverview): OngoingBattle {
    const toMilliseconds = lobby.currentBattle ? lobby.currentBattle.startedAt * 1000 : 0; //FIXME: zero timestamp will be wrong
    const timestamp: Date = new Date(toMilliseconds);
    const battle: OngoingBattle = {
        title: lobby.name,
        gameId: lobby.id,
        engineVersion: lobby.engineVersion,
        gameVersion: lobby.gameVersion,
        mapSpringName: lobby.mapName,
        startTime: timestamp,
        //For our purposes, we are just hardcoding below because they are not relevant at the moment.
        hasBots: 0,
        preset: "team",
        teams: [],
        contenders: [],
        spectators: [],
        script: "",
        battleSettings: { "": "" },
        hostSettings: { "": "" },
        gameSettings: { "": "" },
        mapSettings: { "": "" },
    };
    return battle;
}
</script>
