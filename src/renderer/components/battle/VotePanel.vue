<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="voting-container">
        <Panel class="voting-panel">
            <div :class="['remaining-time', { animating: secondsRemaining !== null && secondsRemaining > 0 }]"></div>

            <div class="title">
                <!-- TODO Need to parse each type differently because they have additional data -->
                <strong>{{ t("lobby.components.battle.votePanel.vote") }}</strong> {{ voteString }}
            </div>

            <div class="actions">
                <Button class="vote-button green" @click="onYes" @keyup.f1="onYes">{{ t("lobby.components.battle.votePanel.yes") }}</Button>
                <Button class="vote-button grey" @click="onAbstain">{{ t("lobby.components.battle.votePanel.abstain") }}</Button>
                <Button class="vote-button grey" @click="onCancel">{{ t("lobby.components.battle.votePanel.cancel") }}</Button>
                <Button class="vote-button red" @click="onNo">{{ t("lobby.components.battle.votePanel.no") }}</Button>
            </div>

            <div v-if="vote?.initiator" class="caller">{{ t("lobby.components.battle.votePanel.calledBy") }} {{ initiatorName }}</div>

            <div v-if="missingYesVotes" class="vote-display">
                <div v-for="i in yesVotes" :key="i" class="segment yes"></div>
                <div v-for="i in missingYesVotes" :key="i" class="segment missing-yes"></div>
                <div v-for="i in abstainVotes" :key="i" class="segment abstain"></div>
                <div v-for="i in missingNoVotes" :key="i" class="segment missing-no"></div>
                <div v-for="i in noVotes" :key="i" class="segment no"></div>
            </div>
        </Panel>
    </div>
</template>

<script lang="ts" setup>
import { onKeyUp } from "@vueuse/core";
import { computed, ref } from "vue";
import { useNow } from "@vueuse/core";
import { useTypedI18n } from "@renderer/i18n";
import Panel from "@renderer/components/common/Panel.vue";
import Button from "@renderer/components/controls/Button.vue";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { LobbyUpdatedEventData } from "tachyon-protocol/types";
import { computedAsync } from "@vueuse/core";
import { db } from "@renderer/store/db";
import { User } from "@main/model/user";

const { t } = useTypedI18n();

const vote = computed(() => {
    // FIX: Remove these casts once https://github.com/beyond-all-reason/tachyon/pull/156 is added
    return (lobbyStore.activeLobby?.currentVote as LobbyUpdatedEventData["currentVote"]) ?? null;
});

const yesVotes = computed(() => {
    if (vote.value?.voters === undefined) {
        return null;
    }
    return Object.values(vote.value?.voters).filter((voter) => voter.vote === "yes").length;
});
const noVotes = computed(() => {
    if (vote.value?.voters === undefined) {
        return null;
    }
    return Object.values(vote.value?.voters).filter((voter) => voter.vote === "no").length;
});
const abstainVotes = computed(() => {
    if (vote.value?.voters === undefined) {
        return null;
    }
    return Object.values(vote.value?.voters).filter((voter) => voter.vote === "abstain").length;
});
const pendingVotes = computed(() => {
    if (vote.value?.voters === undefined) {
        return null;
    }
    return Object.values(vote.value?.voters).filter((voter) => voter.vote === "pending").length;
});
const missingYesVotes = computed(() => {
    if (vote.value?.quorum === undefined || vote.value?.voters === undefined) {
        return null;
    }
    return vote.value.quorum - Object.values(vote.value.voters).filter((voter) => voter.vote === "yes").length;
});
const missingNoVotes = computed(() => {
    if (vote.value?.quorum === undefined || vote.value?.voters === undefined) {
        return null;
    }
    return vote.value.quorum - Object.values(vote.value.voters).filter((voter) => voter.vote === "no").length;
});
const voteMajority = computed(() => {
    if (vote.value?.majority === undefined) {
        return null;
    }
    return vote.value?.majority;
});

const remainingTimeDurationCss = ref("60s");

const now = useNow({ interval: 1000 });
const secondsRemaining = computed(() => {
    if (!vote.value) return null;
    const until = vote.value.until;
    if (!until) return null;
    const deadlineMs = until / 1000;
    return Math.max(0, Math.ceil((deadlineMs - now.value.getTime()) / 1000));
});

onKeyUp("F1", onYes);
onKeyUp("F2", onNo);

function onYes() {
    if (vote.value) {
        lobby.requestVoteSubmit({ id: vote.value?.id, vote: "yes" });
    }
}

function onNo() {
    if (vote.value) {
        lobby.requestVoteSubmit({ id: vote.value?.id, vote: "no" });
    }
}

function onAbstain() {
    if (vote.value) {
        lobby.requestVoteSubmit({ id: vote.value?.id, vote: "abstain" });
    }
}

function onCancel() {
    if (vote.value) {
        // Not yet implemented.
        // lobby.requestVoteSubmit({ id: vote.value?.id, vote: "cancel" });
    }
}

const initiatorName = computedAsync(async () => {
    if (vote.value?.initiator === undefined) return "";
    const name = t("lobby.navbar.messages.userID") + " " + vote.value.initiator;
    const cached: User = (await db.users.get(vote.value.initiator)) as User;
    if (cached != undefined) {
        return await cached.username;
    }
    return name;
});

// TODO: We need name lookups for the UserIds used here.
const voteString = computed(() => {
    if (!vote.value?.action?.type) return "";
    const type = vote.value?.action?.type;
    switch (type) {
        case "kickban":
            if (vote.value.action.banUntil)
                return t("lobby.components.battle.votePanel.actions.kickban", {
                    target: vote.value?.action?.userId,
                    banUntil: vote.value?.action?.banUntil,
                });
            else return t("lobby.components.battle.votePanel.actions.kickOnly", { target: vote.value?.action?.userId });
        case "changeMap":
            return t("lobby.components.battle.votePanel.actions.changeMap", { newMapName: vote.value?.action?.newMapName });
        case "appointBoss":
            return t("lobby.components.battle.votePanel.actions.appointBoss", { target: vote.value?.action?.bossId });
        case "start":
            return t("lobby.components.battle.votePanel.actions.start");
        default:
            return "";
    }
});
</script>

<style lang="scss" scoped>
.voting-container {
    // position: fixed;
    width: 100%;
    left: 0;
    margin-top: -15px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}
.voting-panel {
    background: radial-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9));
    border-radius: 7px;
    overflow: hidden;
    pointer-events: auto;
    :deep(.content) {
        padding: 10px 15px;
        padding-top: 13px;
        padding-bottom: 23px;
        gap: 10px;
        overflow: hidden;
    }
}
.remaining-time {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: rgba(255, 255, 255, 0.15);
    transform: scaleX(1);
    visibility: hidden;
    &.animating {
        visibility: visible;
        transition-property: transform;
        transition-timing-function: linear;
        transition-duration: v-bind(remainingTimeDurationCss);
        transform: scaleX(0);
    }
}
.title {
    text-align: center;
    font-size: 24px;
}
.actions {
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: center;
    gap: 10px;
}
.vote-button {
    font-size: 20px;
    font-weight: 600;
    flex-grow: 1;
}
.caller {
    text-align: center;
    font-size: 14px;
    opacity: 0.8;
}
.vote-display {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 10px;
    display: flex;
    flex-direction: row;
    background: rgba(255, 255, 255, 0.1);
}
.segment {
    flex-grow: 1;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    &:not(:last-child) {
        border-right: 1px solid rgba(0, 0, 0, 0.3);
    }
    &.yes {
        background: rgba(96, 216, 26, 0.6);
    }
    &.missing-yes {
        background: rgba(96, 216, 26, 0.247);
    }
    &.no {
        background: rgba(165, 30, 30, 0.6);
    }
    &.missing-no {
        background: rgba(165, 30, 30, 0.164);
    }
    &.abstain {
        background: rgba(128, 128, 128, 0.6);
    }
}
</style>
