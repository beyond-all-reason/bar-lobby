<template>
    <div class="playerlist">
        <!-- <div class="player" v-for="(player, i) in players" :key="i">
            {{ player.name }}
        </div> -->
    </div>
</template>

<script lang="ts" setup>
import { AllyTeam, Spectator } from "@/model/battle";

const props = defineProps({
    allyTeams: {
        type: Array as () => AllyTeam[],
        default: () => []
    },
    spectators: {
        type: Array as () => Spectator[],
        default: () => []
    }
});
</script>