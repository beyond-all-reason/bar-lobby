<template>
    <div class="playerlist">
        <div v-for="(allyTeam, allyTeamIndex) in allyTeams" :key="allyTeamIndex" class="ally-team">
            <div class="ally-team__title">
                Team {{ allyTeamIndex + 1 }}
            </div>
            <div v-for="(team, teamIndex) in allyTeam.teams" :key="teamIndex" class="team">
                <div v-for="(player, i) in team.players" :key="i" class="player">
                    <Icon icon="account" :size="16" />
                    <div>{{ player.name }}</div>
                </div>
                <div v-for="(ai, i) in team.ais" :key="i" class="player ai-player">
                    <Icon icon="robot" :size="16" />
                    <div>{{ ai.name }} (AI)</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { BattleTypes } from "@/model/battle";
import Icon from "@/components/common/Icon.vue";

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