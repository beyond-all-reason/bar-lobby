<template>
    <div class="playerlist">
        <div v-for="(allyTeam, allyTeamIndex) in battle.allyTeams" :key="allyTeamIndex" class="playerlist__ally-team">
            <div class="playerlist__title">
                Team {{ allyTeamIndex + 1 }}
            </div>
            <div class="playerlist__players">
                <template v-for="(team, teamIndex) in allyTeam.teams" :key="teamIndex">
                    <template v-for="(player, i) in team.players" :key="i">
                        <ContextMenu :entries="playerActions" :args="[player]">
                            <Player v-bind="player" />
                        </ContextMenu>
                    </template>
                    <template v-for="(ai, i) in team.ais" :key="i">
                        <ContextMenu :entries="aiActions" :args="[ai]">
                            <Player v-bind="ai" :is-bot="true" />
                        </ContextMenu>
                    </template>
                </template>
            </div>
        </div>
        <div class="playerlist__spectators playerlist__players">
            <div class="playerlist__title">
                Spectators
            </div>
            <template v-for="(spectator, i) in battle.spectators" :key="i">
                <Player v-bind="spectator" />
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { BattleTypes } from "@/model/battle";
import Player from "@/components/battle/Player.vue";
import ContextMenu, { ContextMenuEntry } from "@/components/common/ContextMenu.vue";

const battle = window.api.battle.currentBattle;

const viewProfile = (player: BattleTypes.Player) => {
    //
};

const kickPlayer = (player: BattleTypes.Player) => {
    //
};

const messagePlayer = (player: BattleTypes.Player) => {
    //
};

const blockPlayer = (player: BattleTypes.Player) => {
    //
};

const addFriend = (player: BattleTypes.Player) => {
    //
};

const reportPlayer = (player: BattleTypes.Player) => {
    //
};

const kickAi = (ai: BattleTypes.AIPlayer) => {
    console.log(ai.name);
};

const playerActions: ContextMenuEntry[] = [
    { label: "View Profile", action: viewProfile },
    { label: "Message", action: messagePlayer },
    { label: "Kick", action: kickPlayer },
    { label: "Block", action: blockPlayer },
    { label: "Add Friend", action: addFriend },
    { label: "Report", action: reportPlayer },
];

const aiActions: ContextMenuEntry[] = [
    { label: "Kick", action: kickAi },
];
</script>