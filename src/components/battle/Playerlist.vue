<template>
    <div class="playerlist">
        <div class="player" v-for="(player, i) in players" :key="i">
            {{ player.name }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Player } from "@/model/battle";

const props = defineProps({
    players: {
        type: Array as () => Player[],
        default: () => []
    }
});
</script>