<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT

This fullscreen chooser presents Quick Start and Custom Skirmish entry points,
then delegates nested navigation and async selection state to NestedChoicePanel.
-->

<template>
    <div class="fullscreen" :class="{ hidden: !battleStore.isSelectingGameMode || !visible }" @click.self="closeOverlay">
        <div class="gamemode-container">
            <NestedChoicePanel
                :choices="skirmishChoices"
                :back-label="t('lobby.components.misc.skirmishEntryChooser.back')"
                :pending-label="t('lobby.components.misc.skirmishEntryChooser.preparingQuickStart')"
                :failure-label="t('lobby.components.misc.skirmishEntryChooser.quickStartFailed')"
                :retry-label="t('lobby.components.misc.skirmishEntryChooser.retryQuickStart')"
                :reset-key="resetKey"
                @completed="completeSelection"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { GameModeID } from "@main/game/battle/battle-types";
import classicImage from "@renderer/assets/images/backgrounds/5.jpg";
import customSkirmishImage from "@renderer/assets/images/modes/classic/custom-skirmish.png";
import quickStartImage from "@renderer/assets/images/modes/classic/quick-start.png";
import ffaImage from "@renderer/assets/images/modes/ffa.jpg";
import raptorsImage from "@renderer/assets/images/modes/raptors.jpg";
import scavengersImage from "@renderer/assets/images/modes/scavengers.webp";
import NestedChoicePanel from "@renderer/components/battle/NestedChoicePanel.vue";
import type { ChoiceActionResult, ChoicePanelItem } from "@renderer/components/battle/nested-choice-panel.types";
import { useTypedI18n } from "@renderer/i18n";
import { battleActions, battleStore, type CreateBeginnerSkirmishResult } from "@renderer/store/battle.store";
import { computed, ref, watch } from "vue";

const props = withDefaults(
    defineProps<{
        visible?: boolean;
    }>(),
    { visible: true }
);

const emit = defineEmits<{
    closed: [];
}>();

const { t } = useTypedI18n();
const resetKey = ref(0);

function quickStartFailureMessage(reason: Exclude<CreateBeginnerSkirmishResult, { ok: true }>["reason"]): string {
    const messages: Record<typeof reason, string> = {
        "content-required": t("lobby.components.misc.skirmishEntryChooser.contentRequired"),
        "player-required": t("lobby.components.misc.skirmishEntryChooser.playerRequired"),
        "ai-unavailable": t("lobby.components.misc.skirmishEntryChooser.aiUnavailable"),
        "no-eligible-map": t("lobby.components.misc.skirmishEntryChooser.noEligibleMap"),
        unexpected: t("lobby.components.misc.skirmishEntryChooser.unexpectedFailure"),
    };
    return messages[reason];
}

async function createQuickStart(): Promise<ChoiceActionResult> {
    const result = await battleActions.createBeginnerSkirmish();
    return result.ok ? result : { ok: false, message: quickStartFailureMessage(result.reason) };
}

function modeChoice(id: string, gameModeId: GameModeID, title: string, description: string, artwork: string): ChoicePanelItem {
    return {
        type: "action",
        id,
        title,
        description,
        artwork,
        run: async () => {
            await battleActions.loadGameMode(gameModeId);
            return { ok: true };
        },
    };
}

const skirmishChoices = computed<ChoicePanelItem[]>(() => [
    {
        type: "action",
        id: "quick-start",
        eyebrow: t("lobby.components.misc.skirmishEntryChooser.recommended"),
        title: t("lobby.components.misc.skirmishEntryChooser.quickStart"),
        description: t("lobby.components.misc.skirmishEntryChooser.quickStartDescription"),
        summary: t("lobby.components.misc.skirmishEntryChooser.quickStartSummary"),
        actionLabel: t("lobby.components.misc.skirmishEntryChooser.createQuickMatch"),
        artwork: quickStartImage,
        run: createQuickStart,
    },
    {
        type: "branch",
        id: "custom-skirmish",
        eyebrow: t("lobby.components.misc.skirmishEntryChooser.fullControl"),
        title: t("lobby.components.misc.skirmishEntryChooser.customSkirmish"),
        description: t("lobby.components.misc.skirmishEntryChooser.customSkirmishDescription"),
        summary: t("lobby.components.misc.skirmishEntryChooser.customSkirmishSummary"),
        actionLabel: t("lobby.components.misc.skirmishEntryChooser.setUpCustom"),
        artwork: customSkirmishImage,
        beforeEnter: battleActions.resetToDefaultBattle,
        children: [
            modeChoice(
                "classic",
                GameModeID.CLASSIC,
                t("lobby.components.misc.gameModeSelector.classic"),
                t("lobby.components.misc.gameModeSelector.classicDescription"),
                classicImage
            ),
            modeChoice(
                "raptors",
                GameModeID.RAPTORS,
                t("lobby.components.misc.gameModeSelector.raptors"),
                t("lobby.components.misc.gameModeSelector.raptorsDescription"),
                raptorsImage
            ),
            modeChoice(
                "scavengers",
                GameModeID.SCAVENGERS,
                t("lobby.components.misc.gameModeSelector.scavengers"),
                t("lobby.components.misc.gameModeSelector.scavengersDescription"),
                scavengersImage
            ),
            modeChoice(
                "ffa",
                GameModeID.FFA,
                t("lobby.components.misc.gameModeSelector.ffa"),
                t("lobby.components.misc.gameModeSelector.ffaDescription"),
                ffaImage
            ),
        ],
    },
]);

function resetPanel() {
    resetKey.value += 1;
}

function closeOverlay() {
    battleStore.isSelectingGameMode = false;
    resetPanel();
}

function completeSelection() {
    battleStore.isSelectingGameMode = false;
    battleStore.isLobbyOpened = true;
    resetPanel();
    emit("closed");
}

watch(
    () => props.visible,
    (visible) => {
        if (!visible) resetPanel();
    }
);
</script>

<style lang="scss" scoped>
.fullscreen {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px) saturate(20%);
    transition: all 0.2s ease-in-out;

    &.hidden {
        pointer-events: none;
        opacity: 0;
    }
}

.gamemode-container {
    align-self: center;
    width: min(1300px, calc(100vw - 120px));
    height: 720px;
    overflow: hidden;
}
</style>
