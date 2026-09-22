<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="voting-container">
        <Panel class="voting-panel" :no-padding="true">
            <div :class="['remaining-time', { animating: secondsRemaining !== null && secondsRemaining > 0 }]"></div>

            <div v-show="vote != undefined">
                <div class="title">
                    <!-- TODO Need to parse each type differently because they have additional data -->
                    <strong>{{ t("lobby.components.battle.votePanel.vote") }}</strong> {{ voteString }}
                </div>

                <div class="actions">
                    <Button class="vote-button green" @click="onYes" @keyup.f1="onYes">{{
                        t("lobby.components.battle.votePanel.yes")
                    }}</Button>
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
            </div>
            <div
                class="history-title"
                @click="toggleCollapse"
                @mouseenter="setHistoryHovered(true)"
                @mouseleave="collapseHistoryIfNotHovered"
            >
                <div>Vote History</div>
                <div class="collapse-history">
                    <div>
                        <Icon v-if="collapsed" :icon="chevronDown" :height="24" />
                        <Icon v-else :icon="chevronUp" :height="24" />
                    </div>
                </div>
            </div>
            <!-- Absolutely positioned so an expanded history overlaps the chat below rather than pushing it down -->
            <div
                v-show="!collapsed"
                class="history-overlay"
                @mouseenter="setHistoryHovered(true)"
                @mouseleave="collapseHistoryIfNotHovered"
            >
                <div v-if="historyEntries.length === 0">No vote history available.</div>
                <div v-for="entry in historyEntries" :key="entry.voteId">
                    <div class="flex-row">
                        <Icon
                            :icon="getHistoryIcon(entry.outcome)"
                            :height="24"
                            :class="['margin-right-sm', getHistoryIconColor(entry.outcome)]"
                        />
                        <div>{{ getVoteString(entry.vote) }}</div>
                    </div>
                </div>
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
import { LobbyUpdatedEventData, VoteActions, VoteOutcomes } from "tachyon-protocol/types";
import { computedAsync } from "@vueuse/core";
import { db } from "@renderer/store/db";
import { User } from "@main/model/user";
import chevronDown from "@iconify-icons/mdi/chevron-down";
import chevronUp from "@iconify-icons/mdi/chevron-up";
import { Icon } from "@iconify/vue";
import successCircleOutline from "@iconify-icons/mdi/success-circle-outline";
import closeCircleOutline from "@iconify-icons/mdi/close-circle-outline";
import circleOffOutline from "@iconify-icons/mdi/circle-off-outline";
import alarm from "@iconify-icons/mdi/alarm";

const { t } = useTypedI18n();

const collapsed = ref(true);
const historyHovered = ref(false);
const historyHoverCloseDelayMs = 100;
let collapseHistoryTimeout: number | undefined;

function toggleCollapse() {
    collapsed.value = !collapsed.value;
}

function setHistoryHovered(hovered: boolean) {
    historyHovered.value = hovered;
    if (hovered && collapseHistoryTimeout !== undefined) {
        window.clearTimeout(collapseHistoryTimeout);
        collapseHistoryTimeout = undefined;
    }
}

function collapseHistoryIfNotHovered() {
    setHistoryHovered(false);
    collapseHistoryTimeout = window.setTimeout(() => {
        collapseHistoryTimeout = undefined;
        if (!historyHovered.value) {
            collapsed.value = true;
        }
    }, historyHoverCloseDelayMs);
}

const vote = computed(() => {
    // FIX: Remove these casts once https://github.com/beyond-all-reason/tachyon/pull/156 is added
    return (lobbyStore.activeLobby?.currentVote as LobbyUpdatedEventData["currentVote"]) ?? null;
});

const historyEntries = computed(() =>
    Object.entries(lobbyStore.activeLobby?.voteHistory ?? {})
        // .filter(([, v]) => v !== null)
        .map(([voteId, v]) => ({ voteId, ...v! }))
        .sort((a, b) => b.finishedAt - a.finishedAt)
);

function getHistoryIcon(outcome: VoteOutcomes) {
    switch (outcome) {
        case "passed":
            return successCircleOutline;
        case "failed":
            return closeCircleOutline;
        case "cancelled":
            return circleOffOutline;
        case "timeout":
            return alarm;
    }
}

function getHistoryIconColor(outcome: VoteOutcomes) {
    switch (outcome) {
        case "passed":
            return "history-icon-passed";
        case "failed":
            return "history-icon-failed";
        case "cancelled":
            return "history-icon-cancelled";
        case "timeout":
            return "history-icon-timeout";
    }
}

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
function getVoteString(voteAction: VoteActions) {
    if (!voteAction?.type) return "";
    const type = voteAction.type;
    switch (type) {
        case "kickban":
            if (voteAction.banUntil)
                return t("lobby.components.battle.votePanel.actions.kickban", {
                    target: voteAction.userId,
                    banUntil: voteAction.banUntil,
                });
            else return t("lobby.components.battle.votePanel.actions.kickOnly", { target: voteAction.userId });
        case "changeMap":
            return t("lobby.components.battle.votePanel.actions.changeMap", { newMapName: voteAction.newMapName });
        case "appointBoss":
            return t("lobby.components.battle.votePanel.actions.appointBoss", { target: voteAction.bossId });
        case "start":
            return t("lobby.components.battle.votePanel.actions.start");
        default:
            return "";
    }
}
const voteString = computed(() => {
    if (!vote.value?.action) return "";
    return getVoteString(vote.value?.action);
});
</script>

<style lang="scss" scoped>
.voting-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
.voting-panel {
    padding: 0px 16px;
    position: relative;
    width: 100%;
    pointer-events: auto;
    :deep(.content) {
        padding: 10px 15px;
        padding-top: 13px;
        padding-bottom: 23px;
        gap: 10px;
    }
}
.remaining-time {
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: rgba(255, 255, 255, 0.521);
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
    // position: absolute;
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
.history-overlay {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.9);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
    z-index: 10;
    padding: 15px;
}
.history-icon-passed {
    color: rgb(96, 216, 26);
}
.history-icon-failed {
    color: rgb(206, 73, 73);
}
.history-icon-cancelled {
    color: rgb(128, 128, 128);
}
.history-icon-timeout {
    color: rgb(128, 128, 128);
}
.history-title {
    font-weight: bold;
    display: flex;
    flex-direction: row;
    align-items: center;
    margin: 0 -15px; // cancel out .content's horizontal padding
    padding: 0px 15px 4px 15px; // restore visual alignment of text
    &:hover {
        cursor: pointer;
        background: linear-gradient(to right, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0));
    }
}
.collapse-history {
    display: flex;
    flex-direction: row;
    margin-left: auto;
}
</style>
