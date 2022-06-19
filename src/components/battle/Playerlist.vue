<template>
    <div class="playerlist" :class="{ dragging: draggedParticipant !== null }">
        <div
            v-for="(team, teamId) in battle.teams.value"
            :key="`team${teamId}`"
            class="group"
            data-type="group"
            @dragenter.prevent="dragEnter($event, teamId)"
            @dragover.prevent
            @dragleave.prevent="dragLeave($event, teamId)"
            @drop="onDrop($event, teamId)"
        >
            <div class="flex-row gap-md">
                <div class="title">Team {{ teamId + 1 }}</div>
                <Button slim :flexGrow="false" @click="addBot(teamId)"> Add bot </Button>
                <Button v-if="battle.me.value?.type !== 'player' || battle.me.value?.teamId !== teamId" slim :flexGrow="false" @click="joinTeam(teamId)"> Join </Button>
            </div>
            <div class="participants">
                <div
                    v-for="(contender, contenderIndex) in battle.getTeamParticipants(teamId)"
                    :key="`contender${contenderIndex}`"
                    draggable
                    @dragstart="dragStart($event, contender)"
                    @dragend="dragEnd($event, contender)"
                >
                    <Participant :battle="battle" :participant="contender" />
                </div>
            </div>
        </div>
        <div
            class="group"
            data-type="group"
            @dragenter.prevent="dragEnter($event, battle.numOfTeams.value)"
            @dragover.prevent
            @dragleave.prevent="dragLeave($event, battle.numOfTeams.value)"
            @drop="onDrop($event, battle.numOfTeams.value)"
        >
            <div class="flex-row gap-md">
                <div class="title">Team {{ battle.numOfTeams.value + 1 }}</div>
                <Button slim :flexGrow="false" @click="addBot(battle.numOfTeams.value)"> Add bot </Button>
                <Button slim :flexGrow="false" @click="joinTeam(battle.numOfTeams.value)"> Join </Button>
            </div>
        </div>
        <div class="group" @dragenter.prevent="dragEnter($event)" @dragover.prevent @dragleave.prevent="dragLeave($event)" @drop="onDrop($event)">
            <div class="flex-row gap-md">
                <div class="title">Spectators</div>
                <Button v-if="battle.me.value?.type !== 'spectator'" slim :flexGrow="false" @click="joinTeam()"> Join </Button>
            </div>
            <div class="participants">
                <div
                    v-for="(spectator, spectatorIndex) in battle.spectators.value"
                    :key="`spectator${spectatorIndex}`"
                    draggable
                    @dragstart="dragStart($event, spectator)"
                    @dragend="dragEnd($event, spectator)"
                >
                    <Participant :battle="battle" :participant="spectator" />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "jaz-ts-utils";
import { Ref, ref } from "vue";

import Participant from "@/components/battle/Participant.vue";
import Button from "@/components/inputs/Button.vue";
import { aiNames } from "@/config/ai-names";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { Faction } from "@/model/battle/types";

const props = defineProps<{
    battle: AbstractBattle;
}>();

const addBot = (teamId: number) => {
    let randomName = randomFromArray(aiNames);
    while (props.battle.contenders.value.some((contender) => contender.type === "bot" && contender.name === randomName)) {
        randomName = randomFromArray(aiNames);
    }

    props.battle.addParticipant({
        playerId: props.battle.contenders.value.length,
        type: "bot",
        teamId,
        name: randomName!,
        aiShortName: "BARb",
        faction: Faction.Armada,
        ownerUserId: api.session.currentUser.userId,
        aiOptions: {},
    });
};

const joinTeam = (teamId?: number) => {
    if (props.battle.me.value?.type === "spectator" && teamId !== undefined) {
        props.battle.spectatorToPlayer(props.battle.me.value, teamId);
    } else if (props.battle.me.value?.type === "player" && teamId === undefined) {
        props.battle.playerToSpectator(props.battle.me.value);
    } else if (props.battle.me.value?.type === "player" && teamId !== undefined) {
        props.battle.changeContenderTeam(props.battle.me.value, teamId);
    }
};

let draggedParticipant: Ref<Bot | Player | Spectator | null> = ref(null);
let draggedEl: Element | null = null;

const dragEnter = (event: DragEvent, teamId?: number) => {
    if (!draggedParticipant.value) {
        return;
    }

    const target = event.target as HTMLElement;
    const groupEl = target.closest("[data-type=group]");
    if (draggedEl && groupEl) {
        document.querySelectorAll("[data-type=group]").forEach((el) => {
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
    if (!draggedParticipant.value) {
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
    const participantEl = draggedEl?.querySelector("[data-type=participant]");
    if (participantEl) {
        participantEl.classList.add("dragging");
    }
};

const dragEnd = (event: DragEvent, participant: Player | Bot | Spectator) => {
    const participantEl = draggedEl?.querySelector("[data-type=participant]");
    if (participantEl) {
        participantEl.classList.remove("dragging");
    }
    draggedParticipant.value = null;
    draggedEl = null;

    document.querySelectorAll("[data-type=group]").forEach((el) => {
        el.classList.remove("highlight");
    });
};

const onDrop = (event: DragEvent, teamId?: number) => {
    const target = event.target as Element;
    if (target.getAttribute("data-type") === "group" && draggedParticipant.value) {
        const participantName = draggedParticipant.value.type === "bot" ? draggedParticipant.value.name : api.session.getUserById(draggedParticipant.value.userId)?.username;
        if (!participantName) {
            return;
        }
        if (teamId !== undefined && draggedParticipant.value.type !== "spectator") {
            props.battle.changeContenderTeam(draggedParticipant.value, teamId);
        } else if (draggedParticipant.value.type === "player") {
            props.battle.playerToSpectator(draggedParticipant.value);
        } else if (teamId !== undefined && draggedParticipant.value.type === "spectator") {
            props.battle.spectatorToPlayer(draggedParticipant.value, teamId);
        }
    }
};
</script>

<style lang="scss" scoped>
.playerlist {
    display: flex;
    flex-direction: column;
    &.dragging .group > * {
        pointer-events: none;
    }
}
.group {
    position: relative;
    &:not(:last-child):after {
        content: "";
        display: flex;
        background: rgba(255, 255, 255, 0.1);
        width: 100%;
        height: 1px;
        margin: 10px 0;
    }
    &.highlight {
        &:before {
            @extend .fullsize;
            width: calc(100% + 10px);
            height: calc(100%);
            left: -5px;
            top: -5px;
            background: rgba(255, 255, 255, 0.1);
        }
    }
}
.title {
    font-size: 26px;
}
.participants {
    display: flex;
    flex-direction: row;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 5px;
}
</style>
