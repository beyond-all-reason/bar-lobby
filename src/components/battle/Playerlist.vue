<template>
    <div class="playerlist" :class="{ dragging: draggedParticipant !== null }">
        <div
            v-for="(team, teamId) in battle.teams.value"
            :key="`team${teamId}`"
            class="playerlist__group"
            @dragenter.prevent="dragEnter($event, teamId)"
            @dragover.prevent
            @dragleave.prevent="dragLeave($event, teamId)"
            @drop="onDrop($event, teamId)"
        >
            <div class="flex-row gap-md">
                <div class="playerlist__title">
                    Team {{ teamId + 1 }}
                </div>
                <Button slim :flex-grow="false" @click="addBot(teamId)">
                    Add bot
                </Button>
                <Button v-if="battle.me.value.type !== 'player' || battle.me.value.teamId !== teamId" slim :flex-grow="false" @click="joinTeam(teamId)">
                    Join
                </Button>
            </div>
            <div class="playerlist__participants">
                <div
                    v-for="(contender, contenderIndex) in battle.getTeamParticipants(teamId)"
                    :key="`contender${contenderIndex}`"
                    draggable
                    @dragstart="dragStart($event, contender)"
                    @dragend="dragEnd($event, contender)"
                >
                    <Participant :participant="contender" />
                </div>
            </div>
        </div>
        <div
            class="playerlist__group"
            @dragenter.prevent="dragEnter($event, battle.numOfTeams.value)"
            @dragover.prevent
            @dragleave.prevent="dragLeave($event, battle.numOfTeams.value)"
            @drop="onDrop($event, battle.numOfTeams.value)"
        >
            <div class="flex-row gap-md">
                <div class="playerlist__title">
                    Team {{ battle.numOfTeams.value + 1 }}
                </div>
                <Button slim :flex-grow="false" @click="addBot(battle.numOfTeams.value)">
                    Add bot
                </Button>
                <Button slim :flex-grow="false" @click="joinTeam(battle.numOfTeams.value)">
                    Join
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
                <div
                    v-for="(spectator, spectatorIndex) in battle.spectators.value"
                    :key="`spectator${spectatorIndex}`"
                    draggable
                    @dragstart="dragStart($event, spectator)"
                    @dragend="dragEnd($event, spectator)"
                >
                    <Participant :participant="spectator" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import Participant from "@/components/battle/Participant.vue";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import Button from "@/components/inputs/Button.vue";
import { Faction } from "@/model/battle/types";
import { randomFromArray } from "jaz-ts-utils";
import { aiNames } from "@/config/ai-names";
import { Ref, ref } from "vue";

const battle = api.session.currentBattle;

const addBot = (teamId: number) => {
    let randomName = randomFromArray(aiNames);
    while (battle.contenders.value.some(contender => contender.type === "bot" && contender.name === randomName)) {
        randomName = randomFromArray(aiNames);
    }

    battle.addParticipant({
        id: battle.contenders.value.length,
        type: "bot",
        teamId,
        name: randomName!,
        aiShortName: "BARb",
        faction: Faction.Armada,
        ownerUserId: api.session.currentUser.userId,
        aiOptions: {}
    });
};

const joinTeam = (teamId?: number) => {
    if (teamId === undefined && battle.me.value.type === "player") {
        battle.playerToSpectator(battle.me.value);
    } else if (teamId !== undefined) {
        if (battle.me.value.type === "spectator") {
            battle.spectatorToPlayer(battle.me.value, teamId);
        } else {
            battle.me.value.teamId = teamId;
        }
    }
};

let draggedParticipant: Ref<Bot | Player | Spectator | null> = ref(null);
let draggedEl: Element | null = null;

const dragEnter = (event: DragEvent, teamId?: number) => {
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

    const draggingContenderToOwnTeam = draggedParticipant.value.type !== "spectator" && draggedParticipant.value.teamId === teamId;
    const draggingSpectatorToSpectator = draggedParticipant.value.type === "spectator" && teamId === undefined;
    const draggingBotToSpectator = draggedParticipant.value.type === "bot" && teamId === undefined;
    if (draggingContenderToOwnTeam || draggingSpectatorToSpectator || draggingBotToSpectator) {
        // TODO: disable drag cursor
        return;
    }

    if (groupEl) {
        groupEl.classList.add("highlight");
    }
};

const dragLeave = (event: DragEvent, teamId?: number) => {
    if (!draggedParticipant.value ) {
        return;
    }

    const draggingContenderToOwnTeam = draggedParticipant.value.type !== "spectator" && draggedParticipant.value.teamId === teamId;
    const draggingSpectatorToSpectator = draggedParticipant.value.type === "spectator" && teamId === undefined;
    const draggingBotToSpectator = draggedParticipant.value.type === "bot" && teamId === undefined;
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

const onDrop = (event: DragEvent, teamId?: number) => {
    const target = event.target as Element;
    if (target.classList.contains("playerlist__group") && draggedParticipant.value) {
        target.classList.remove("playerlist__group--drag-enter");
        if (teamId !== undefined && draggedParticipant.value.type !== "spectator") {
            draggedParticipant.value.teamId = teamId;
        } else if (draggedParticipant.value.type === "player") {
            battle.playerToSpectator(draggedParticipant.value);
        } else if (teamId !== undefined && draggedParticipant.value.type === "spectator") {
            battle.spectatorToPlayer(draggedParticipant.value, teamId);
        }
    }
};
</script>