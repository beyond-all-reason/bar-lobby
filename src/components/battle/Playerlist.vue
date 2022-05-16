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
                <Button slim :flex-grow="false" @click="removeTeam(team)" v-if="battle.teams.length > 2">
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
                        <Participant :participant="contender" />
                    </div>
                </template>
            </div>
        </div>
        <div class="playerlist__group">
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
                        <Participant :participant="spectator" />
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import Participant from "@/components/battle/Participant.vue";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import Button from "@/components/inputs/Button.vue";
import { Faction, TeamPreset } from "@/model/battle/types";
import { randomFromArray } from "jaz-ts-utils";
import { aiNames } from "@/config/ai-names";
import { Team } from "@/model/battle/team";
import { Ref, ref } from "vue";

const battle = api.session.currentBattle;

const addBot = (team: Team) => {
    let randomName = randomFromArray(aiNames);
    while (battle.contenders.value.some(contender => contender.type === "bot" && contender.name === randomName)) {
        randomName = randomFromArray(aiNames);
    }

    battle.addParticipant({
        id: battle.contenders.value.length,
        type: "bot",
        team,
        name: randomName!,
        aiShortName: "BARb",
        faction: Faction.Armada,
        ownerUserId: api.session.currentUser.userId,
        aiOptions: {}
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

let draggedParticipant: Ref<Bot | Player | Spectator | null> = ref(null);
let draggedEl: Element | null = null;

const dragEnter = (event: DragEvent, team?: Team) => {
    if (!draggedParticipant.value ) {
        return;
    }

    const target = event.target as HTMLElement;
    const groupEl = target.closest(".playerlist__group");
    if (draggedEl && groupEl) {
        document.querySelectorAll(".playerlist__group").forEach(el => {
            el.classList.remove("highlight");
        });
    }

    const draggingContenderToOwnTeam = draggedParticipant.value.type !== "spectator" && draggedParticipant.value.team === team;
    const draggingSpectatorToSpectator = draggedParticipant.value.type === "spectator" && team === undefined;
    const draggingBotToSpectator = draggedParticipant.value.type === "bot" && team === undefined;
    if (draggingContenderToOwnTeam || draggingSpectatorToSpectator || draggingBotToSpectator) {
        // TODO: disable drag cursor
        return;
    }

    if (groupEl) {
        groupEl.classList.add("highlight");
    }
};

const dragLeave = (event: DragEvent, team?: Team) => {
    if (!draggedParticipant.value ) {
        return;
    }

    const draggingContenderToOwnTeam = draggedParticipant.value.type !== "spectator" && draggedParticipant.value.team === team;
    const draggingSpectatorToSpectator = draggedParticipant.value.type === "spectator" && team === undefined;
    const draggingBotToSpectator = draggedParticipant.value.type === "bot" && team === undefined;
    if (draggingContenderToOwnTeam || draggingSpectatorToSpectator || draggingBotToSpectator) {
        // TODO: disable drag cursor
        return;
    }
};

const dragStart = (event: DragEvent, participant: Player | Bot | Spectator) => {
    draggedParticipant.value = participant;
    draggedEl = event.target as Element;
    const participantEl = draggedEl?.querySelector(".playerlist__participant");
    if (participantEl) {
        participantEl.classList.add("dragging");
    }
};

const dragEnd = (event: DragEvent, participant: Player | Bot | Spectator) => {
    const participantEl = draggedEl?.querySelector(".playerlist__participant");
    if (participantEl) {
        participantEl.classList.remove("dragging");
    }
    draggedParticipant.value = null;
    draggedEl = null;

    document.querySelectorAll(".playerlist__group").forEach(el => {
        el.classList.remove("highlight");
    });
};

const onDrop = (event: DragEvent, team?: Team) => {
    const target = event.target as Element;
    if (target.classList.contains("playerlist__group") && draggedParticipant.value) {
        target.classList.remove("playerlist__group--drag-enter");
        if (team !== undefined && draggedParticipant.value.type !== "spectator") {
            draggedParticipant.value.team = team;
        } else if (draggedParticipant.value.type === "player") {
            battle.playerToSpectator(draggedParticipant.value);
        } else if (team !== undefined && draggedParticipant.value.type === "spectator") {
            battle.spectatorToPlayer(draggedParticipant.value, team);
        }
    }
};
</script>