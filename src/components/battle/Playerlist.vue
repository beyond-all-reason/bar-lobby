<template>
    <div class="playerlist" :class="{ dragging: draggedParticipant !== null }">
        <div
            v-for="(team, teamIndex) in battle.teams"
            :key="teamIndex"
            class="playerlist__group"
            @dragenter.prevent="dragEnter($event, team)"
            @dragover.prevent
            @dragleave.prevent="dragLeave($event, team)"
            @drop="onDrop($event, team)"
        >
            <div class="flex-row gap-md">
                <div class="playerlist__title">
                    Team {{ teamIndex + 1 }}
                </div>
                <Button v-if="battle.battleOptions.teamPreset === TeamPreset.Custom" slim :flex-grow="false" @click="removeTeam(team)">
                    Remove
                </Button>
                <Button slim :flex-grow="false" @click="addBot(team)">
                    Add bot
                </Button>
                <Button v-if="battle.me.value.type !== 'player' || battle.me.value.team !== team" slim :flex-grow="false" @click="joinTeam(team)">
                    Join
                </Button>
            </div>
            <div class="playerlist__participants">
                <template v-for="(contender, contenderIndex) in battle.getTeamParticipants(team)" :key="contenderIndex">
                    <div draggable @dragstart="dragStart($event, contender)" @dragend="dragEnd($event, contender)">
                        <ContextMenu :entries="getActions(contender)" :args="[contender]">
                            <Participant :participant="contender" />
                        </ContextMenu>
                    </div>
                </template>
            </div>
        </div>
        <div v-if="battle.battleOptions.teamPreset === TeamPreset.Custom" class="playerlist__group">
            <div class="flex-row">
                <Button slim :flex-grow="false" @click="addTeam">
                    Add Team
                </Button>
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
                <Button v-if="battle.me.value.type !== 'spectator'" slim :flex-grow="false" @click="joinTeam()">
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
import { Faction, TeamPreset } from "@/model/battle/types";
import { randomFromArray } from "jaz-ts-utils";
import { aiNames } from "@/config/ai-names";
import { Team } from "@/model/battle/team";

const battle = api.battle;

const addBot = (team: Team) => {
    let randomName = randomFromArray(aiNames);
    while (battle.contenders.value.some(contender => contender.type === "bot" && contender.name === randomName)) {
        randomName = randomFromArray(aiNames);
    }

    battle.addParticipant({
        id: battle.contenders.value.length,
        type: "bot",
        team,
        name: randomName,
        aiShortName: "BARb",
        faction: Faction.Armada,
        ownerUserId: api.session.currentUser.userId
    });
};

const joinTeam = (team?: Team) => {
    if (team === undefined && battle.me.value.type === "player") {
        battle.playerToSpectator(battle.me.value);
    } else if (team !== undefined) {
        if (battle.me.value.type === "spectator") {
            battle.spectatorToPlayer(battle.me.value, team);
        } else {
            battle.me.value.team = team;
        }
    }
};

const removeTeam = (team: Team) => {
    battle.removeTeam(team);
};

const addTeam = () => {
    battle.addTeam();
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

const dragEnter = (event: DragEvent, team?: Team) => {
    dragCounter++;

    const target = event.target as HTMLElement;
    const groupEl = target.closest(".playerlist__group");

    if (draggedParticipant && draggedEl && groupEl) {
        const draggingContenderToOwnTeam = draggedParticipant.type !== "spectator" && draggedParticipant.team === team;
        const draggingSpectatorToSpectator = draggedParticipant.type === "spectator" && team === undefined;
        const draggingBotToSpectator = draggedParticipant.type === "bot" && team === undefined;
        if (draggingContenderToOwnTeam || draggingSpectatorToSpectator || draggingBotToSpectator) {
            // TODO: disable drag cursor
            return;
        }
        dragTeamEl = groupEl;
        groupEl.classList.add("highlight");
    }
};

const dragLeave = (event: DragEvent, team?: Team) => {
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

const onDrop = (event: DragEvent, team?: Team) => {
    const target = event.target as Element;
    if (target.classList.contains("playerlist__group") && draggedParticipant) {
        target.classList.remove("playerlist__group--drag-enter");
        if (team !== undefined && draggedParticipant.type !== "spectator") {
            draggedParticipant.team = team;
        } else if (draggedParticipant.type === "player") {
            battle.playerToSpectator(draggedParticipant);
        } else if (team !== undefined && draggedParticipant.type === "spectator") {
            battle.spectatorToPlayer(draggedParticipant, team);
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
        if (participant.userId === api.session.currentUser.userId) {
            return selfActions;
        } else {
            return playerActions;
        }
    }
};
</script>