<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div :key="`team${teamId}`" class="group" data-type="group">
        <div class="group-header flex-row flex-center-items gap-md">
            <div class="title">{{ title }}</div>
            <div class="member-count">
                <div>
                    {{ t("lobby.components.battle.teamComponent.players", { count: memberCount, maxCount: maxMembersPerAllyTeam }) }}
                </div>
            </div>
            <Button class="slim black" @click="addBotClicked(teamId)">
                {{ t("lobby.components.battle.teamComponent.addBot") }}
            </Button>
            <div class="collapse-team">
                <div @click="toggleCollapse">
                    <Icon v-if="collapsed" :icon="chevronDown" :height="24" />
                    <Icon v-else :icon="chevronUp" :height="24" />
                </div>
            </div>
        </div>
        <div v-show="!collapsed">
            <div v-for="(member, key) in allyMembers" :key="key" class="participant">
                <LobbyParticipant :player="member" />
            </div>
            <div v-for="(bot, key) in allyBots" :key="key" class="participant">
                <LobbyBotParticipant :bot="bot" :team-id="bot.allyTeam" :host-id="bot.hostUserId" :bot-id="bot.id" />
            </div>
        </div>
        <div v-show="!collapsed">
            <div v-for="(_, i) in getAmountOfJoinButtons(maxMembersPerAllyTeam, memberCount)" :key="i">
                <button class="join-button" :class="{ first: i === 0 }" @click="onJoinClicked(teamId)">
                    {{ t("lobby.components.battle.teamComponent.join") }}
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import LobbyBotParticipant from "@renderer/components/lobbies/LobbyBotParticipant.vue";
import LobbyParticipant from "@renderer/components/lobbies/LobbyParticipant.vue";
import Button from "@renderer/components/controls/Button.vue";
import { battleWithMetadataStore, battleStore } from "@renderer/store/battle.store";
import { lobbyStore } from "@renderer/store/lobby.store";
import { UserId } from "tachyon-protocol/types";
import chevronDown from "@iconify-icons/mdi/chevron-down";
import chevronUp from "@iconify-icons/mdi/chevron-up";
import { Icon } from "@iconify/vue";

const { t } = useTypedI18n();

const props = defineProps<{
    teamId: string;
}>();

const collapsed = ref(false);

function toggleCollapse() {
    collapsed.value = !collapsed.value;
}

const title = computed(() => t("lobby.components.battle.teamComponent.teamId", { id: Number(props.teamId) + 1 }));

const allyMembers = computed(() => {
    let arr: Member[] = [];
    if (battleStore.isOnline && lobbyStore.activeLobby?.allyTeamConfig) {
        if (lobbyStore.activeLobby.players) {
            for (const memberKey in lobbyStore.activeLobby.players) {
                const member = lobbyStore.activeLobby.players[memberKey];
                if (member.allyTeam == props.teamId) arr.push(member as Member);
            }
            return arr;
        }
    }
    return arr;
});

const allyBots = computed(() => {
    let arr: LobbyBot[] = [];
    if (battleStore.isOnline && lobbyStore.activeLobby?.allyTeamConfig) {
        if (lobbyStore.activeLobby.bots) {
            for (const botKey in lobbyStore.activeLobby.bots) {
                const bot = lobbyStore.activeLobby.bots[botKey];
                if (bot.allyTeam == props.teamId) arr.push(bot);
            }
            return arr;
        }
    }
    return arr;
});

const memberCount = computed(() => {
    if (battleStore.isOnline && lobbyStore.activeLobby?.allyTeamConfig) {
        let count = 0;
        if (lobbyStore.activeLobby.players) {
            for (const memberKey in lobbyStore.activeLobby.players) {
                const member = lobbyStore.activeLobby.players[memberKey];
                if (member.allyTeam == props.teamId) count++;
            }
        }
        if (lobbyStore.activeLobby.bots) {
            for (const botKey in lobbyStore.activeLobby.bots) {
                const bot = lobbyStore.activeLobby.bots[botKey];
                if (bot.allyTeam == props.teamId) count++;
            }
        }
        return count;
    } else {
        return battleWithMetadataStore.teams[props.teamId].participants.length || 0;
    }
});

const maxMembersPerAllyTeam = computed(() => {
    if (battleStore.isOnline && lobbyStore.activeLobby?.allyTeamConfig) {
        // Server always gives us team "000" as the first one, and the players per team is currently always the same
        return lobbyStore.activeLobby.allyTeamConfig[props.teamId].maxTeams;
    } else return 1;
});

// This is not defined in the protocol as type/interface, but it's consistent for type "player" so we are just going to define it ourselves.
interface Member {
    id: UserId;
    allyTeam: string;
    team: string;
    player: string;
}
interface LobbyBot {
    id: string;
    hostUserId: string;
    allyTeam: string;
    team: string;
    player: string;
    name?: string;
    shortName?: string;
    version?: string | null;
    options?: {
        [k: string]: string;
    };
}

function getAmountOfJoinButtons(maxPlayersPerTeam: number | undefined, memberCount: number) {
    if (!maxPlayersPerTeam) return 1;

    // notice that we can have more members than the max players so that it can be negative
    const amount = maxPlayersPerTeam - memberCount;

    // we only return positive amount, otherwise we return 0 so that
    // we don't render any join buttons because the team is full or over full at this point
    if (amount > 0) return amount;
    return 0;
}

// const showJoin = computed(() => {
//     return props.teamId !== me.battleRoomState.teamId;
// });

const emit = defineEmits(["addBotClicked", "onJoinClicked", "onDragStart", "onDragEnd", "onDragEnter", "onDrop"]);
function addBotClicked(teamId: string) {
    emit("addBotClicked", teamId);
}

function onJoinClicked(teamId: string) {
    emit("onJoinClicked", teamId);
}
</script>

<style lang="scss" scoped>
.group {
    border: 1px inset rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.5);
    // min-height: 100px;
    padding: 10px;
    position: relative;
    display: flex;
    flex-direction: column;
    &.highlight {
        &:before {
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.1);
        }
    }
    &.highlight-error {
        &:before {
            width: 100%;
            height: 100%;
            background: rgba(255, 100, 100, 0.1);
        }
    }
    &.raptor {
        border-color: rgb(206, 73, 73);
        background-image: url("/src/renderer/assets/images/modes/raptors.jpg");
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }
    &.scavenger {
        border-color: rgb(135, 69, 176);
        background-image: url("/src/renderer/assets/images/modes/scavengers.webp");
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
    }
}

.group-header {
    margin-bottom: 4px;
}

.participant {
    height: 46px;
}

.title {
    font-size: 20px;
    filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.8));
}

.member-count {
    filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.8));
    display: inline-block;
    vertical-align: middle;
}

.team-members {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex-wrap: wrap;
    margin-top: 5px;
}

.join-button {
    height: 46px;
    &.first {
        border-top: none;
    }
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding: 8px;
    width: 100%;
    text-align: center;
    text-transform: uppercase;
    text-shadow: inset 0 0 10px rgba(0, 0, 0, 1);
    font-size: 1.2em;
    color: rgba(255, 255, 255, 0.15);
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 1);
    &:hover {
        color: rgba(255, 255, 255, 0.9);
        background-color: rgba(255, 255, 255, 0.05);
    }
}

.add-bot-button {
    height: 46px;
    width: 100%;

    border: 1px solid rgba(255, 55, 95, 0.4);

    padding: 8px;
    margin-bottom: 4px;

    text-align: center;
    text-transform: uppercase;
    text-shadow: inset 0 0 10px rgba(0, 0, 0, 1);
    font-size: 1.2em;

    color: rgba(255, 55, 95, 0.7);
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 1);

    &:hover {
        color: rgba(255, 255, 255, 0.9);
        background-color: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.2);
    }
}
.collapse-team {
    display: flex;
    flex-direction: row;
    margin-left: auto;
}
</style>
