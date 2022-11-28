<template>
    <div class="playerlist" :class="{ dragging: draggedParticipant !== null }">
        <AddBotModal
            v-model="botListOpen"
            :engine-version="battle.battleOptions.engineVersion"
            :team-id="botModalTeamId"
            title="Add Bot"
            @bot-selected="onBotSelected" />
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
const engine = props.battle.battleOptions.engineVersion;
await api.content.ai.processAis(engine);

const openBotList = (teamId: number) => {
    botModalTeamId.value = teamId;
    botListOpen.value = true;
};

const onBotSelected = (bot: string, teamId: number) => {
    botListOpen.value = false;
    addBot(bot, teamId);
};

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
    const playerIsSpectator = props.me.battleStatus.isSpectator;
    if (playerIsSpectator && teamId >= 0) {
        props.battle.spectatorToPlayer(props.me, teamId);
    } else if (!playerIsSpectator && teamId < 0) {
        props.battle.playerToSpectator(props.me);
    } else if (!playerIsSpectator && teamId >= 0) {
        props.battle.setContenderTeam(props.me, teamId);
    }
};

let draggedParticipant: Ref<User | Bot | null> = ref(null);
let draggedEl: Element | null = null;

const dragEnter = (event: DragEvent, teamId: number) => {
    if (!draggedParticipant.value) {
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
    // this is a little verbose, but previous syntax was very hard to read
    const playerMember = draggedParticipant.value as User;
    const botMember = draggedParticipant.value as Bot;
    const isPlayer = "battleStatus" in playerMember;
    const isBot = "teamId" in botMember;
    const isSpectator = isPlayer && playerMember.battleStatus.isSpectator;
    const memberTeamId = playerMember?.battleStatus?.teamId ?? botMember.teamId;

    const invalidMove = (isBot && teamId < 0) || (isSpectator && teamId < 0) || (memberTeamId === teamId && !isSpectator);

    if (groupEl) {
        invalidMove ? groupEl.classList.add("highlight-error") : groupEl.classList.add("highlight");
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
        el.classList.remove("highlight-error");
    });
};

const onDrop = (event: DragEvent, teamId: number) => {
    const target = event.target as Element;
    if (!draggedParticipant.value || target.getAttribute("data-type") !== "group") {
        return;
    }
    const playerMember = draggedParticipant.value as User;
    const isPlayer = "battleStatus" in playerMember;
    const isSpectator = isPlayer && playerMember.battleStatus.isSpectator;

    if (teamId >= 0) {
        // move to team
        if ((isPlayer && !isSpectator) || !isPlayer) {
            props.battle.setContenderTeam(draggedParticipant.value, teamId);
        } else if (isPlayer && isSpectator) {
            props.battle.spectatorToPlayer(playerMember, teamId);
        }
    } else {
        // move to spectate
        if (isPlayer && !isSpectator) {
            props.battle.playerToSpectator(playerMember);
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
    &.highlight-error {
        &:before {
            @extend .fullsize;
            width: calc(100% + 10px);
            height: calc(100%);
            left: -5px;
            top: -5px;
            background: rgba(255, 100, 100, 0.1);
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
