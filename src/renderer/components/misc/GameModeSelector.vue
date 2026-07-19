<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <DiagonalChoiceLevel :choices="choices" @selected="selectGameMode" />
</template>

<script lang="ts" setup>
import { GameModeID } from "@main/game/battle/battle-types";
import DiagonalChoiceLevel from "@renderer/components/battle/DiagonalChoiceLevel.vue";
import type { DiagonalChoice } from "@renderer/components/battle/diagonal-choice.types";
import { useTypedI18n } from "@renderer/i18n";
import { battleActions } from "@renderer/store/battle.store";

const { t } = useTypedI18n();
const emit = defineEmits<{
    selected: [];
}>();

const choices: DiagonalChoice[] = [
    {
        id: "classic",
        title: t("lobby.components.misc.gameModeSelector.classic"),
        description: t("lobby.components.misc.gameModeSelector.classicDescription"),
        artwork: "/src/renderer/assets/images/backgrounds/5.jpg",
    },
    {
        id: "raptors",
        title: t("lobby.components.misc.gameModeSelector.raptors"),
        description: t("lobby.components.misc.gameModeSelector.raptorsDescription"),
        artwork: "/src/renderer/assets/images/modes/raptors.jpg",
    },
    {
        id: "scavengers",
        title: t("lobby.components.misc.gameModeSelector.scavengers"),
        description: t("lobby.components.misc.gameModeSelector.scavengersDescription"),
        artwork: "/src/renderer/assets/images/modes/scavengers.webp",
    },
    {
        id: "ffa",
        title: t("lobby.components.misc.gameModeSelector.ffa"),
        description: t("lobby.components.misc.gameModeSelector.ffaDescription"),
        artwork: "/src/renderer/assets/images/modes/ffa.jpg",
    },
];

const gameModeByChoiceId: Record<string, GameModeID> = {
    classic: GameModeID.CLASSIC,
    raptors: GameModeID.RAPTORS,
    scavengers: GameModeID.SCAVENGERS,
    ffa: GameModeID.FFA,
};

async function selectGameMode(choiceId: string) {
    const gameMode = gameModeByChoiceId[choiceId];

    if (gameMode === undefined) {
        return;
    }

    await battleActions.loadGameMode(gameMode);
    emit("selected");
}
</script>
