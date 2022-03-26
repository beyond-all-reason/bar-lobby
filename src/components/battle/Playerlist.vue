<template>
    <div class="playerlist">
        <div v-for="(allyTeam, allyTeamIndex) in allyTeams" :key="allyTeamIndex" class="playerlist__ally-team">
            <div class="playerlist__title">
                Team {{ allyTeamIndex + 1 }}
            </div>
            <div class="playerlist__players">
                <template v-for="(team, teamIndex) in allyTeam.teams" :key="teamIndex">
                    <template v-for="(player, i) in team.players" :key="i">
                        <Player v-bind="player" />
                    </template>
                    <template v-for="(ai, i) in team.ais" :key="i">
                        <Player v-bind="ai" :is-bot="true" />
                    </template>
                </template>
            </div>
        </div>
        <div class="playerlist__spectators playerlist__players">
            <div class="playerlist__title">
                Spectators
            </div>
            <template v-for="(spectator, i) in spectators" :key="i">
                <Player v-bind="spectator" />
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { BattleTypes } from "@/model/battle";
import Player from "@/components/battle/Player.vue";

const props = withDefaults(defineProps<{
    allyTeams?: BattleTypes.AllyTeam[];
    spectators?: BattleTypes.Spectator[];
}>(), {
    allyTeams: () => [],
    spectators: () => []
});
</script>