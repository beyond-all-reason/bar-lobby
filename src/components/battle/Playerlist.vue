<template>
    <div class="playerlist">
        <div v-for="(allyTeam, allyTeamIndex) in battle.allyTeams" :key="allyTeamIndex" class="playerlist__ally-team">
            <div class="playerlist__title">
                Team {{ allyTeamIndex + 1 }}
            </div>
            <div class="playerlist__players">
                <template v-for="(player, i) in allyTeam.players" :key="i">
                    <ContextMenu :entries="playerActions" :args="[player]">
                        <BattlePlayer :player="player" />
                    </ContextMenu>
                </template>
                <template v-for="(bot, i) in allyTeam.bots" :key="i">
                    <ContextMenu :entries="botActions" :args="[bot]">
                        <BattlePlayer :player="bot" />
                    </ContextMenu>
                </template>
            </div>
        </div>
        <div class="playerlist__spectators playerlist__players">
            <div class="playerlist__title">
                Spectators
            </div>
            <template v-for="(spectator, i) in battle.spectators" :key="i">
                <BattlePlayer :player="spectator" />
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import BattlePlayer from "@/components/battle/BattlePlayer.vue";
import ContextMenu, { ContextMenuEntry } from "@/components/common/ContextMenu.vue";
import { Bot } from "@/model/battle/bot";
import { Player } from "@/model/battle/player";

const battle = window.api.battle.currentBattle;

const viewProfile = (player: Player) => {
    //
};

const kickPlayer = (player: Player) => {
    //
};

const messagePlayer = (player: Player) => {
    //
};

const blockPlayer = (player: Player) => {
    //
};

const addFriend = (player: Player) => {
    //
};

const reportPlayer = (player: Player) => {
    //
};

const kickAi = (ai: Bot) => {
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

const botActions: ContextMenuEntry[] = [
    { label: "Kick", action: kickAi },
];
</script>