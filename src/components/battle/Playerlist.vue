<template>
    <div class="playerlist">
        <div class="ally-team" v-for="(allyTeam, i) in allyTeams" :key="i">
            <div class="ally-team__title">Team {{ i + 1 }}</div>
            <div class="team" v-for="(team, i) in allyTeam.teams" :key="i">
                <div v-for="(player, i) in team.players" :key="i" class="player">
                    <Icon icon="account" :size="16"></Icon>
                    <div>{{ player.name }}</div>
                </div>
                <div v-for="(ai, i) in team.ais" :key="i" class="player ai-player">
                    <Icon icon="robot" :size="16"></Icon>
                    <div>{{ ai.name }} ({{ ai.ai }})</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { BattleTypes } from "@/model/battle";
import Icon from "../common/Icon.vue";

const props = defineProps({
    allyTeams: {
        type: Array as () => BattleTypes.AllyTeam[],
        default: () => []
    },
    spectators: {
        type: Array as () => BattleTypes.Spectator[],
        default: () => []
    }
});
</script>