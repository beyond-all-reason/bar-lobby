<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal :title="t('lobby.components.battle.addBotModal.title')">
        <div class="flex-col gap-md container">
            <Button
                v-for="(ai, i) in enginesStore.selectedEngineVersion?.ais"
                :key="i"
                v-tooltip.bottom="{ value: ai.description }"
                class="ai-button"
                @click="addBot(ai)"
            >
                {{ ai.name }}
            </Button>

            <Button
                v-for="(ai, i) in gameStore.selectedGameVersion?.ais?.filter(
                    (ai) => ai.shortName !== 'RaptorsAI' && ai.shortName !== 'ScavengersAI'
                )"
                :key="i"
                v-tooltip.bottom="{ value: ai.description }"
                class="ai-button"
                @click="addBot(ai)"
            >
                {{ ai.name }}
            </Button>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { useTypedI18n } from "@renderer/i18n";
import Modal from "@renderer/components/common/Modal.vue";
import Button from "@renderer/components/controls/Button.vue";
import { EngineAI } from "@main/content/engine/engine-version";
import { GameAI } from "@main/content/game/game-version";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";

const { t } = useTypedI18n();

const props = defineProps<{
    engineVersion: string;
    gameVersion: string;
    teamId: number;
}>();

const emit = defineEmits<{
    (event: "bot-selected", ai: EngineAI | GameAI, teamId: number): void;
}>();

function addBot(ai: EngineAI | GameAI) {
    emit("bot-selected", ai, props.teamId);
}
</script>

<style lang="scss" scoped>
.ai-button {
    padding: 15px;
}
.container {
    width: 500px;
}
</style>
