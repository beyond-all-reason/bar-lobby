<template>
    <div class="playerlist">
        <div
            v-for="(allyTeam, allyTeamIndex) in battle.allyTeams"
            :key="allyTeamIndex"
            class="playerlist__ally-team"
            @dragenter.prevent="dragEnter($event)"
            @dragover.prevent
            @dragleave.prevent="dragLeave($event)"
            @drop="onDrop($event, allyTeamIndex)"
        >
            <div class="playerlist__title">
                Team {{ allyTeamIndex + 1 }}
            </div>
            <div class="playerlist__players">
                <template v-for="(contender, i) in battle.getAllyTeamParticipants(allyTeam.id)" :key="i">
                    <div draggable @dragstart="dragStart($event, contender)" @dragend="dragEnd($event, contender)">
                        <ContextMenu :entries="playerActions" :args="[contender]">
                            <Participant :participant="contender" />
                        </ContextMenu>
                    </div>
                </template>
                <!-- <template v-for="(bot, i) in allyTeam.bots" :key="i">
                    <div draggable @dragstart="dragStart($event, bot)" @dragend="dragEnd($event, bot)">
                        <ContextMenu :entries="botActions" :args="[bot]">
                            <BattlePlayer :player="bot" />
                        </ContextMenu>
                    </div>
                </template> -->
            </div>
        </div>
        <div
            class="playerlist__spectators playerlist__players"
            @dragenter.prevent="dragEnter($event)"
            @dragleave.prevent="dragLeave($event)"
        >
            <div class="playerlist__title">
                Spectators
            </div>
            <template v-for="(spectator, i) in battle.spectators.value" :key="i">
                <div
                    draggable
                    @dragstart="dragStart($event, spectator)"
                    @dragend="dragEnd($event, spectator)"
                    @dragover.prevent
                    @drop="onDrop($event, -1)"
                >
                    <Participant :participant="spectator" />
                </div>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import Participant from "@/components/battle/Participant.vue";
import ContextMenu, { ContextMenuEntry } from "@/components/common/ContextMenu.vue";
import { Bot, Player, Spectator } from "@/model/battle/participants";
import { ref } from "vue";

const battle = window.api.session.currentBattle;

const draggingPlayer = ref(false);

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

let draggedBattler: Bot | Player | Spectator | undefined;
let draggedElement: HTMLElement | undefined;

const dragEnter = (event: DragEvent) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (target.className === "playerlist__ally-team" && draggedElement && !target.contains(draggedElement)) {
        draggingPlayer.value = true;
        target.classList.add("playerlist__ally-team--drag-enter");
        const playersEl = target.querySelector(".playerlist__players");
        if (playersEl) {
            playersEl.appendChild(draggedElement);
        }
    }
};

const dragLeave = (event: DragEvent) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (target.classList.contains("playerlist__ally-team")) {
        draggingPlayer.value = false;
        target.classList.remove("playerlist__ally-team--drag-enter");
    }
};

const dragStart = (event: DragEvent, battler: Player | Bot | Spectator) => {
    draggedBattler = battler;
    draggedElement = event.target as HTMLElement;
    event.dataTransfer!.dropEffect = "move";
    event.dataTransfer!.effectAllowed = "move";
};

const dragEnd = (event: DragEvent, battler: Player | Bot | Spectator) => {
    draggedBattler = undefined;
    draggedElement = undefined;
    draggingPlayer.value = false;
};

const onDrop = (event: any, allyTeamIndex: number) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("playerlist__ally-team")) {
        target.classList.remove("playerlist__ally-team--drag-enter");
        if (allyTeamIndex === -1) {
            //window.api.battle.removeBattler(draggedBattler, target.dataset.allyTeamIndex);
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

const botActions: ContextMenuEntry[] = [
    { label: "Kick", action: kickAi },
];
</script>