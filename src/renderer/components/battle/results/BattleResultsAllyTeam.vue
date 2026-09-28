<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="ally-team" :class="{ winner: team.isWinner, mine: team.containsMe }">
        <div class="header" :class="{ collapsible }" @click="toggle">
            <Icon v-if="collapsible" :icon="collapsed ? chevronRight : chevronDown" height="20" />
            <Icon v-if="team.isWinner" :icon="crown" height="22" class="crown" />
            <span class="label">{{ t("lobby.components.battle.battleResults.team", { team: allyTeamDisplayNumber(team.id) }) }}</span>
            <span v-if="team.isWinner" class="winner-label">{{ t("lobby.components.battle.battleResults.winner") }}</span>
            <span class="count">{{ team.players.length + team.bots.length }}</span>
        </div>
        <div v-if="!collapsed" class="members">
            <BattleResultsPlayer v-for="player in team.players" :key="player.userId" :userId="player.userId" :name="player.name" />
            <BattleResultsBot v-for="bot in team.bots" :key="`${bot.team}-${bot.player}`" :shortName="bot.shortName" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import crown from "@iconify-icons/mdi/crown";
import chevronDown from "@iconify-icons/mdi/chevron-down";
import chevronRight from "@iconify-icons/mdi/chevron-right";
import type { AllyTeamView } from "@renderer/model/battleResults";
import { allyTeamDisplayNumber } from "@renderer/composables/useBattleResults";
import { useTypedI18n } from "@renderer/i18n";
import BattleResultsPlayer from "@renderer/components/battle/results/BattleResultsPlayer.vue";
import BattleResultsBot from "@renderer/components/battle/results/BattleResultsBot.vue";

const props = withDefaults(
    defineProps<{
        team: AllyTeamView;
        collapsible?: boolean;
    }>(),
    { collapsible: false }
);

const { t } = useTypedI18n();

const collapsed = ref(props.collapsible && props.team.defaultCollapsed);

function toggle() {
    if (props.collapsible) collapsed.value = !collapsed.value;
}
</script>

<style lang="scss" scoped>
.ally-team {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
}
.header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    &.collapsible {
        cursor: pointer;
        &:hover {
            background: rgba(255, 255, 255, 0.1);
        }
    }
}
.winner .header {
    border-bottom-color: rgba(255, 215, 0, 0.6);
}
.crown,
.winner-label {
    color: gold;
}
.winner-label {
    text-transform: uppercase;
    font-size: 14px;
}
.count {
    margin-left: auto;
    opacity: 0.6;
}
.members {
    display: flex;
    flex-direction: column;
    gap: 3px;
}
</style>
