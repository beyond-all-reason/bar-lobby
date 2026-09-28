<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <TeamParticipant>
        <div class="flex-row flex-center">
            <GameIconsVelociraptor v-if="shortName === 'RaptorsAI'" />
            <Icon v-else-if="shortName === 'ScavengersAI'" :icon="robotAngry" />
            <Icon v-else :icon="robot" />
        </div>
        <div class="name">{{ shortName }}</div>
    </TeamParticipant>
</template>

<script lang="ts" setup>
import { Icon } from "@iconify/vue";
import robot from "@iconify-icons/mdi/robot";
import robotAngry from "@iconify-icons/mdi/robot-angry";
import TeamParticipant from "@renderer/components/battle/TeamParticipant.vue";
import GameIconsVelociraptor from "@renderer/components/icons/GameIconsVelociraptor.vue";

defineProps<{
    shortName: string;
}>();
</script>

<style lang="scss" scoped>
.name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
