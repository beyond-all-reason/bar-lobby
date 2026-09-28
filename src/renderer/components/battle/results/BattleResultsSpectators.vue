<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div v-if="spectators.length" class="spectators">
        <div class="header" @click="collapsed = !collapsed">
            <Icon :icon="collapsed ? chevronRight : chevronDown" height="20" />
            <Icon :icon="eye" height="20" />
            <span>{{ t("lobby.components.battle.battleResults.spectators") }}</span>
            <span class="count">{{ spectators.length }}</span>
        </div>
        <div v-if="!collapsed" class="members">
            <BattleResultsPlayer
                v-for="spectator in spectators"
                :key="spectator.userId"
                :userId="spectator.userId"
                :name="spectator.name"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import eye from "@iconify-icons/mdi/eye";
import chevronDown from "@iconify-icons/mdi/chevron-down";
import chevronRight from "@iconify-icons/mdi/chevron-right";
import type { BattleResultsSpectator } from "@renderer/model/battleResults";
import { useTypedI18n } from "@renderer/i18n";
import BattleResultsPlayer from "@renderer/components/battle/results/BattleResultsPlayer.vue";

defineProps<{
    spectators: BattleResultsSpectator[];
}>();

const { t } = useTypedI18n();

const collapsed = ref(true);
</script>

<style lang="scss" scoped>
.spectators {
    display: flex;
    flex-direction: column;
    gap: 5px;
}
.header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    font-weight: 600;
    cursor: pointer;
    opacity: 0.8;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
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
