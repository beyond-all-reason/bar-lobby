<template>
    <div class="playerlist" :class="{ dragging: draggedParticipant !== null }">
        <div
            v-for="allyTeam in battle.allyTeams"
            :key="allyTeam.id"
            class="playerlist__group"
            @dragenter.prevent="dragEnter($event, allyTeam.id)"
            @dragover.prevent
            @dragleave.prevent="dragLeave($event, allyTeam.id)"
            @drop="onDrop($event, allyTeam.id)"
        >
            <div class="flex-row gap-md">
                <div class="playerlist__title">
                    Team {{ allyTeam.id + 1 }}
                </div>
                <Button slim :flex-grow="false" @click="addBot(allyTeam.id)">
                    Add bot
                </Button>
                <Button v-if="battle.me.value.type === 'player' && battle.me.value.allyTeamId !== allyTeam.id" slim :flex-grow="false" @click="joinTeam(allyTeam.id)">
                    Join
                </Button>
            </div>
            <div class="playerlist__participants">
                <template v-for="(contender, i) in battle.getAllyTeamParticipants(allyTeam.id)" :key="i">
                    <div draggable @dragstart="dragStart($event, contender)" @dragend="dragEnd($event, contender)">
                        <ContextMenu :entries="getActions(contender)" :args="[contender]">
                            <Participant :participant="contender" />
                        </ContextMenu>
                    </div>
                </template>
            </div>
        </div>
        <div
            class="playerlist__group"
            @dragenter.prevent="dragEnter($event)"
            @dragover.prevent
            @dragleave.prevent="dragLeave($event)"
            @drop="onDrop($event)"
        >
            <div class="flex-row gap-md">
                <div class="playerlist__title">
                    Spectators
                </div>
                <Button slim :flex-grow="false" @click="joinTeam()">
                    Join
                </Button>
            </div>
            <div class="playerlist__participants">
                <template v-for="(spectator, i) in battle.spectators.value" :key="i">
                    <div draggable @dragstart="dragStart($event, spectator)" @dragend="dragEnd($event, spectator)">
                        <ContextMenu :entries="getActions(spectator)" :args="[spectator]">
                            <Participant :participant="spectator" />
                        </ContextMenu>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import Participant from "@/components/battle/Participant.vue";
import ContextMenu, { ContextMenuEntry } from "@/components/common/ContextMenu.vue";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import Button from "@/components/inputs/Button.vue";
import { Faction } from "@/model/battle/types";
import { randomFromArray } from "jaz-ts-utils";
import { aiNames } from "@/config/ai-names";

const battle = api.battle;

const addBot = (allyTeamId: number) => {
    let randomName = randomFromArray(aiNames);
    while (battle.contenders.value.some(contender => contender.type === "bot" && contender.name === randomName)) {
        randomName = randomFromArray(aiNames);
    }

    battle.addContender({
        type: "bot",
        allyTeamId,
        name: randomName,
        aiShortName: "BARb",
        faction: Faction.Armada,
        ownerUserId: window.api.session.currentUser.userId
    });
};

const joinTeam = (allyTeamId?: number) => {
    if (allyTeamId === undefined && battle.me.value.type === "player") {
        battle.playerToSpectator(battle.me.value);
    } else if (allyTeamId !== undefined) {
        if (battle.me.value.type === "spectator") {
            battle.spectatorToPlayer(battle.me.value);
        } else {
            battle.me.value.allyTeamId = allyTeamId;
        }
    }
};

const viewProfile = (player: Player) => {
    //
};

const kickPlayer = (player: Player) => {
    //
};

const messagePlayer = (player: Player) => {
    //
};

const blockPlayer = (player: Player) => {
    //
};

const addFriend = (player: Player) => {
    //
};

const reportPlayer = (player: Player) => {
    //
};

const kickAi = (bot: Bot) => {
    battle.removeParticipant(bot);
};

let draggedParticipant: Bot | Player | Spectator | null = null;
let draggedEl: Element | null = null;
let dragTeamEl: Element | null = null;
let dragCounter = 0;

const dragEnter = (event: DragEvent, allyTeamId?: number) => {
    dragCounter++;

    const target = event.target as HTMLElement;
    const groupEl = target.closest(".playerlist__group");

    if (draggedParticipant && draggedEl && groupEl) {
        const draggingContenderToOwnTeam = draggedParticipant.type !== "spectator" && draggedParticipant.allyTeamId === allyTeamId;
        const draggingSpectatorToSpectator = draggedParticipant.type === "spectator" && allyTeamId === undefined;
        const draggingBotToSpectator = draggedParticipant.type === "bot" && allyTeamId === undefined;
        if (draggingContenderToOwnTeam || draggingSpectatorToSpectator || draggingBotToSpectator) {
            // TODO: disable drag cursor
            return;
        }
        dragTeamEl = groupEl;
        groupEl.classList.add("highlight");
    }
};

const dragLeave = (event: DragEvent, allyTeamId?: number) => {
    dragCounter--;

    const target = event.target as Element;
    const groupEl = target.closest(".playerlist__group");

    if (dragCounter === 0 && groupEl) {
        groupEl.classList.remove("highlight");
    }
};

const dragStart = (event: DragEvent, participant: Player | Bot | Spectator) => {
    dragCounter = 0;

    draggedParticipant = participant;
    draggedEl = event.target as Element;
    const participantEl = draggedEl?.querySelector(".participant");
    if (participantEl) {
        participantEl.classList.add("dragging");
    }
};

const dragEnd = (event: DragEvent, participant: Player | Bot | Spectator) => {
    const participantEl = draggedEl?.querySelector(".participant");
    if (participantEl) {
        participantEl.classList.remove("dragging");
    }
    draggedParticipant = null;
    draggedEl = null;
    dragTeamEl = null;

    document.querySelectorAll(".playerlist__group").forEach(el => {
        el.classList.remove("highlight");
    });
};

const onDrop = (event: any, allyTeamIndex?: number) => {
    const target = event.target as Element;
    if (target.classList.contains("playerlist__group") && draggedParticipant) {
        target.classList.remove("playerlist__group--drag-enter");
        if (allyTeamIndex !== undefined && draggedParticipant.type !== "spectator") {
            draggedParticipant.allyTeamId = allyTeamIndex;
        } else if (draggedParticipant.type === "player") {
            battle.playerToSpectator(draggedParticipant);
        } else if (draggedParticipant.type === "spectator") {
            battle.spectatorToPlayer(draggedParticipant, allyTeamIndex);
        }
    }
};

const playerActions: ContextMenuEntry[] = [
    { label: "View Profile", action: viewProfile },
    { label: "Message", action: messagePlayer },
    { label: "Kick", action: kickPlayer },
    { label: "Block", action: blockPlayer },
    { label: "Add Friend", action: addFriend },
    { label: "Report", action: reportPlayer },
];

const selfActions: ContextMenuEntry[] = [
    { label: "View Profile", action: viewProfile },
];

const botActions: ContextMenuEntry[] = [
    { label: "Kick", action: kickAi },
];

const getActions = (participant: Player | Bot | Spectator) => {
    if (participant.type === "bot") {
        return botActions;
    } else {
        if (participant.userId === window.api.session.currentUser.userId) {
            return selfActions;
        } else {
            return playerActions;
        }
    }
};
</script>