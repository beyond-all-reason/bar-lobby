<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <AddBotModal
        v-if="battleStore.battleOptions.engineVersion && battleStore.battleOptions.gameVersion"
        v-model="botListOpen"
        :engineVersion="battleStore.battleOptions.engineVersion"
        :gameVersion="battleStore.battleOptions.gameVersion"
        :teamId="botModalTeamId"
        :title="t('lobby.components.battle.addBotModal.title')"
        @bot-selected="onBotSelected"
    />
    <div class="scroll-container padding-right-sm">
        <div class="playerlist" :class="{ dragging: draggedBot || draggedPlayer }">
            <TeamComponent
                v-for="(team, teamId) in battleWithMetadataStore.teams"
                :key="teamId"
                :teamId="teamId"
                @add-bot-clicked="openBotList"
                @on-join-clicked="joinTeam"
                @on-drag-start="dragStart"
                @on-drag-end="dragEnd"
                @on-drag-enter="dragEnterTeam"
                @on-drop="onDropTeam"
            />
        </div>
        <hr class="margin-top-sm margin-bottom-sm" />
        <div class="playerlist" :class="{ dragging: draggedBot || draggedPlayer }">
            <SpectatorsComponent
                class="spectators"
                @on-join-clicked="joinSpectators"
                @on-drag-start="dragStart"
                @on-drag-end="dragEnd"
                @on-drag-enter="dragEnterSpectators"
                @on-drop="onDropSpectators"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Ref, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";

import AddBotModal from "@renderer/components/battle/AddBotModal.vue";
import TeamComponent from "@renderer/components/battle/TeamComponent.vue";
import { EngineAI } from "@main/content/engine/engine-version";
import { Bot, isBot, isRaptor, isScavenger, Player } from "@main/game/battle/battle-types";
import { battleWithMetadataStore, battleStore, battleActions } from "@renderer/store/battle.store";
import SpectatorsComponent from "@renderer/components/battle/SpectatorsComponent.vue";
import { GameAI } from "@main/content/game/game-version";

const { t } = useTypedI18n();

const botListOpen = ref(false);
const botModalTeamId = ref(0);

function openBotList(teamId: number) {
    botModalTeamId.value = teamId;
    botListOpen.value = true;
}

function onBotSelected(bot: EngineAI | GameAI, teamId: number) {
    botListOpen.value = false;
    battleActions.addBot(bot, teamId);
}

function joinTeam(teamId: number) {
    if (battleStore.me) battleActions.movePlayerToTeam(battleStore.me, teamId);
}

function joinSpectators() {
    if (battleStore.me) battleActions.movePlayerToSpectators(battleStore.me);
}

const draggedPlayer: Ref<Player | null> = ref(null);
const draggedBot: Ref<Bot | null> = ref(null);
let draggedEl: Element | null = null;

function dragEnterTeam(event: DragEvent) {
    if (!draggedPlayer.value && !draggedBot.value) {
        return;
    }
    const target = event.target as HTMLElement;
    const groupEl = target.closest("[data-type=group]");
    if (draggedEl && groupEl) {
        document.querySelectorAll("[data-type=group]").forEach((el) => {
            el.classList.remove("highlight");
            el.classList.remove("highlight-error");
        });
    }
    groupEl?.classList.add("highlight");
}

function dragEnterSpectators(event: DragEvent) {
    if (!draggedPlayer.value && !draggedBot.value) {
        return;
    }
    const target = event.target as HTMLElement;
    const groupEl = target.closest("[data-type=group]");
    if (draggedEl && groupEl) {
        document.querySelectorAll("[data-type=group]").forEach((el) => {
            el.classList.remove("highlight");
            el.classList.remove("highlight-error");
        });
    }
    if (draggedPlayer.value) {
        groupEl?.classList.add("highlight");
    }
    if (draggedBot.value) {
        groupEl?.classList.add("highlight-error");
    }
}

function dragStart(event: DragEvent, participant: Player | Bot) {
    if (isBot(participant)) {
        draggedBot.value = participant;
    } else {
        draggedPlayer.value = participant;
    }
    draggedEl = event.target as Element;
    const participantEl = draggedEl?.querySelector("[data-type=participant]");
    if (participantEl) {
        participantEl.classList.add("dragging");
    }
    document.addEventListener("dragend", dragEnd);
}

function dragEnd() {
    const participantEl = draggedEl?.querySelector("[data-type=participant]");
    if (participantEl) {
        participantEl.classList.remove("dragging");
    }
    draggedBot.value = null;
    draggedPlayer.value = null;
    draggedEl = null;
    document.querySelectorAll("[data-type=group]").forEach((el) => {
        el.classList.remove("highlight");
        el.classList.remove("highlight-error");
    });
    document.removeEventListener("dragend", dragEnd);
}

function onDropTeam(event: DragEvent, teamId: number) {
    const target = event.target as Element;
    if (!draggedBot.value && !draggedPlayer.value) {
        return;
    }
    if (target.getAttribute("data-type") !== "group") {
        return;
    }
    if (draggedBot.value) {
        if ((isRaptor(draggedBot.value) || isScavenger(draggedBot.value)) && battleStore.teams[teamId].participants.length != 0) {
            draggedBot.value = null;
        } else {
            battleActions.moveBotToTeam(draggedBot.value, teamId);
        }
    }
    if (draggedPlayer.value) {
        battleActions.movePlayerToTeam(draggedPlayer.value, teamId);
    }
}

function onDropSpectators(event: DragEvent) {
    const target = event.target as Element;
    if (draggedBot.value || !draggedPlayer.value || target.getAttribute("data-type") !== "group") {
        if (isBot(draggedBot.value) && (isRaptor(draggedBot.value) || isScavenger(draggedBot.value))) {
            draggedBot.value = null;
        }
        return;
    }
    battleActions.movePlayerToSpectators(draggedPlayer.value);
}
</script>

<style lang="scss" scoped>
.playerlist {
    display: grid;
    grid-template-columns: 1fr;
    grid-auto-rows: max-content;
    gap: 10px;
    &.dragging .group > * {
        pointer-events: none;
    }
}
</style>
