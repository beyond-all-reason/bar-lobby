<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="layout">
        <div class="columns" :style="{ '--columns': columns }">
            <BattleResultsAllyTeam
                v-for="(team, index) in view.allyTeams"
                :key="team.id"
                :team="team"
                class="reveal-item"
                :style="{ '--reveal-index': index }"
            />
        </div>
        <BattleResultsSpectators :spectators="view.spectators" class="reveal-item" :style="{ '--reveal-index': view.allyTeams.length }" />
    </div>
</template>

<script lang="ts" setup>
import type { BattleResultsView } from "@renderer/model/battleResults";
import BattleResultsAllyTeam from "@renderer/components/battle/results/BattleResultsAllyTeam.vue";
import BattleResultsSpectators from "@renderer/components/battle/results/BattleResultsSpectators.vue";

defineProps<{
    view: BattleResultsView;
    columns: number;
}>();
</script>

<style lang="scss" scoped>
.layout {
    display: flex;
    flex-direction: column;
    gap: 20px;
}
.columns {
    display: grid;
    grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    gap: 15px;
    align-items: start;
}
</style>
