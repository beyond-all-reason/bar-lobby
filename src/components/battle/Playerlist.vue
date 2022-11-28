<template>
    <div class="playerlist" :class="{ dragging: draggedParticipant !== null }">
        <AddBotModal
            v-model="botListOpen"
            :engine-version="battle.battleOptions.engineVersion"
            :team-id="botModalTeamId"
            title="Add Bot"
            @bot-selected="onBotSelected"
        />
        <TeamComponent
            v-for="[teamId, name] in sortedTeams"
            :team-id="teamId"
            :battle="battle"
            :me="me"
            @add-bot-clicked="openBotList"
            @on-join-clicked="joinTeam"
            @on-drag-start="dragStart"
            @on-drag-end="dragEnd"
            @on-drag-enter="dragEnter"
            @on-drop="onDrop"
        />
    </div>
</template>

<script lang="ts" setup>
import { randomFromArray } from "jaz-ts-utils";
import { computed, ComputedRef, Ref, ref } from "vue";

import { aiNames } from "@/config/ai-names";
import { AbstractBattle } from "@/model/battle/abstract-battle";
import { Bot, Faction } from "@/model/battle/types";
import { CurrentUser, User } from "@/model/user";
import AddBotModal from "@/components/battle/AddBotModal.vue";
import TeamComponent from "@/components/battle/TeamComponent.vue";

const props = defineProps<{
    battle: AbstractBattle;
    me: CurrentUser;
}>();
const botListOpen = ref(false);
const botModalTeamId = ref(0);

const sortedTeams = computed(() => {
    const teams = new Map(props.battle.teams.value);
    teams.set(teams.size, []); // Empty team
    teams.set(-1, props.battle.spectators.value); // Spectators
    return teams;
});

// This data is improperly cached, I'm unsure of the ideal way to fix it. I force it to refetch
const engine = props.battle.battleOptions.engineVersion
await api.content.ai.processAis(engine);

const openBotList = (teamId: number) => {
    botModalTeamId.value = teamId;
    botListOpen.value = true;
}

const onBotSelected = (bot: string, teamId: number) => {
    botListOpen.value = false;
    addBot(bot, teamId);
}

const addBot = (bot: string, teamId: number) => {
    let randomName = randomFromArray(aiNames);
    while (props.battle.bots.some((bot) => bot.name === randomName)) {
        randomName = randomFromArray(aiNames);
    }

    props.battle.addBot({
        playerId: props.battle.contenders.value.length,
        teamId,
        name: randomName!,
        aiShortName: bot,
        faction: Faction.Armada,
        ownerUserId: props.me.userId,
        aiOptions: {},
    });
};

const joinTeam = (teamId: number) => {
    if (props.me.battleStatus.isSpectator && teamId !== undefined) {
        props.battle.spectatorToPlayer(props.me, teamId);
    } else if (!props.me.battleStatus.isSpectator && (teamId === undefined || teamId < 0)) {
        props.battle.playerToSpectator(props.me);
    } else if (!props.me.battleStatus.isSpectator && teamId !== undefined) {
        props.battle.setContenderTeam(props.me, teamId);
    }
};

let draggedParticipant: Ref<User | Bot | null> = ref(null);
let draggedEl: Element | null = null;

const dragEnter = (event: DragEvent) => {
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
    if (groupEl) {
        groupEl.classList.add("highlight");
    }
};

const dragStart = (event: DragEvent, participant: User | Bot) => {
    draggedParticipant.value = participant;
    draggedEl = event.target as Element;
    const participantEl = draggedEl?.querySelector("[data-type=participant]");
    if (participantEl) {
        participantEl.classList.add("dragging");
    }
};

const dragEnd = () => {
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

const onDrop = (event: DragEvent, teamId: number) => {
    const target = event.target as Element;
    console.log('ondrop, drag participant, teamid', draggedParticipant.value, teamId);
    if(!draggedParticipant.value || target.getAttribute("data-type") !== "group") {
        return;
    }
    const isPlayer = "userId" in draggedParticipant.value;
    const playerIsSpectator = isPlayer ? (draggedParticipant.value as User).battleStatus.isSpectator : false;

    if (teamId >= 0) {
        // move to team
        if(isPlayer && !playerIsSpectator || !isPlayer) {
            props.battle.setContenderTeam(draggedParticipant.value, teamId);
        } else if (isPlayer && playerIsSpectator) {
            props.battle.spectatorToPlayer(draggedParticipant.value as User, teamId);
        }
    } else {
        // spectate
        if(isPlayer && !playerIsSpectator) {
            props.battle.playerToSpectator(draggedParticipant.value as User);
        }
    }

};
</script>

<style lang="scss" scoped>
.playerlist {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding-right: 5px;
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
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 5px;
}
</style>
