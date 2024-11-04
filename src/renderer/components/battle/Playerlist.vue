<template>
    <AddBotModal
        v-model="botListOpen"
        :engineVersion="battleStore.battleOptions.engineVersion"
        :gameVersion="battleStore.battleOptions.gameVersion"
        :teamId="botModalTeamId"
        title="Add Bot"
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

import AddBotModal from "@renderer/components/battle/AddBotModal.vue";
import TeamComponent from "@renderer/components/battle/TeamComponent.vue";
import { EngineAI } from "@main/content/engine/engine-version";
import { Bot, isBot, Player } from "@main/game/battle/battle-types";
import { battleWithMetadataStore, battleStore, battleActions } from "@renderer/store/battle.store";
import { me } from "@renderer/store/me.store";
import SpectatorsComponent from "@renderer/components/battle/SpectatorsComponent.vue";

const botListOpen = ref(false);
const botModalTeamId = ref(0);

function openBotList(teamId: number) {
    botModalTeamId.value = teamId;
    botListOpen.value = true;
}

//TODO only handling engine AIs for now
function onBotSelected(bot: EngineAI, teamId: number) {
    botListOpen.value = false;
    addBot(bot, teamId);
}

//TODO only handling engine AIs for now
function addBot(ai: EngineAI, teamId: number) {
    battleStore.teams[teamId].push({
        id: battleWithMetadataStore.participants.length,
        name: ai.name,
        aiOptions: {}, //TODO where to get this from?
        aiShortName: ai.shortName,
        ownerUserId: me.userId,
    } as Bot);
}

function joinTeam(teamId: number) {
    battleActions.movePlayerToTeam(battleStore.me, teamId);
}

function joinSpectators() {
    battleActions.movePlayerToSpectators(battleStore.me);
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
    groupEl.classList.add("highlight");
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
        groupEl.classList.add("highlight");
    }
    if (draggedBot.value) {
        groupEl.classList.add("highlight-error");
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
        battleActions.moveBotToTeam(draggedBot.value, teamId);
    }
    if (draggedPlayer.value) {
        battleActions.movePlayerToTeam(draggedPlayer.value, teamId);
    }
}

function onDropSpectators(event: DragEvent) {
    const target = event.target as Element;
    if (draggedBot.value || !draggedPlayer.value || target.getAttribute("data-type") !== "group") {
        return;
    }
    battleActions.movePlayerToSpectators(draggedPlayer.value);
}
</script>

<style lang="scss" scoped>
.playerlist {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: max-content;
    gap: 10px;
    &.dragging .group > * {
        pointer-events: none;
    }
    @media (max-width: 1919px) {
        grid-template-columns: 1fr;
    }
}
</style>
