<!--
SPDX-FileCopyrightText: 2025 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <div class="voting-container">
        <div class="voting-panel" :no-padding="true">
            <div ref="remainingTimeEl" :class="['remaining-time', { visible: !!vote?.until }]"></div>

            <div v-show="vote != undefined">
                <div class="title">
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

                <div v-if="vote?.initiator" class="caller">
                    {{ t("lobby.components.battle.votePanel.calledBy", { initiator: initiatorName }) }}
                </div>

                <template v-if="tally">
                    <!-- Yes fills from the left, no from the right, pending voters are the gap; whichever side crosses the finish line (majority) has won -->
                    <div class="majority-bar">
                        <template v-if="tally.bar">
                            <div class="fill yes" :style="{ width: `${tally.bar.yes * 100}%` }"></div>
                            <div class="fill no" :style="{ width: `${tally.bar.no * 100}%` }"></div>
                        </template>
                        <div
                            class="finish-line"
                            :style="{ left: `${tally.majority * 100}%` }"
                            :title="`${Math.round(tally.majority * 1000) / 10}%`"
                        ></div>
                    </div>
                    <div :class="['quorum-text', { met: tally.quorumMet }]">
                        {{ t("lobby.components.battle.votePanel.quorum", { cast: tally.cast, quorum: tally.quorum }) }}
                    </div>
                </template>
            </div>
            <div
                class="history-title"
                @click="toggleCollapse"
                @mouseenter="setHistoryHovered(true)"
                @mouseleave="collapseHistoryIfNotHovered"
            >
                <div>{{ t("lobby.components.battle.votePanel.history") }}</div>
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
                <div v-if="historyEntries.length === 0">{{ t("lobby.components.battle.votePanel.noHistory") }}</div>
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
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onKeyUp } from "@vueuse/core";
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useTypedI18n } from "@renderer/i18n";
import Button from "@renderer/components/controls/Button.vue";
import { lobby, lobbyStore } from "@renderer/store/lobby.store";
import { VoteOutcomes } from "tachyon-protocol/types";
import chevronDown from "@iconify-icons/mdi/chevron-down";
import chevronUp from "@iconify-icons/mdi/chevron-up";
import { Icon } from "@iconify/vue";
import successCircleOutline from "@iconify-icons/mdi/success-circle-outline";
import closeCircleOutline from "@iconify-icons/mdi/close-circle-outline";
import circleOffOutline from "@iconify-icons/mdi/circle-off-outline";
import alarm from "@iconify-icons/mdi/alarm";
import { useVoteString } from "@renderer/composables/useVoteString";
import { tallyVote } from "@renderer/utils/vote-tally";

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

const vote = computed(() => lobbyStore.activeLobby?.currentVote ?? null);

const historyEntries = computed(() =>
    Object.entries(lobbyStore.activeLobby?.voteHistory ?? {})
        .map(([voteId, v]) => ({ voteId, ...v }))
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

const tally = computed(() => (vote.value ? tallyVote(vote.value) : null));

// The countdown bar uses the Web Animations API rather than a CSS transition. A transition needs the browser to have
// painted the scaleX(1) state before the end state is applied, which is unreliable here: this component can be mounted
// while its kept-alive parent view is detached (e.g. rejoining a lobby), and deactivated components still re-render.
// element.animate() declares its start keyframe explicitly and runs on the document timeline, so it doesn't depend on
// paint timing or on the element being attached.
const remainingTimeEl = ref<HTMLElement>();
let remainingTimeAnimation: Animation | undefined;

function startRemainingTimeAnimation() {
    remainingTimeAnimation?.cancel();
    remainingTimeAnimation = undefined;
    const until = vote.value?.until;
    if (!remainingTimeEl.value || !until) return;
    const remainingMs = until / 1000 - Date.now();
    if (remainingMs <= 0) return;
    remainingTimeAnimation = remainingTimeEl.value.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
        duration: remainingMs,
        easing: "linear",
        fill: "forwards",
    });
}

onMounted(startRemainingTimeAnimation);
watch([() => vote.value?.id, () => vote.value?.until], startRemainingTimeAnimation, { flush: "post" });
onUnmounted(() => remainingTimeAnimation?.cancel());

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
        lobby.requestVoteCancel();
    }
}

const { displayNames, getVoteString } = useVoteString();

const initiatorName = computed(() => {
    if (vote.value?.initiator === undefined) return "";
    return displayNames.value?.get(vote.value.initiator) ?? t("lobby.navbar.messages.userID") + " " + vote.value.initiator;
});

const voteString = computed(() => getVoteString(vote.value?.action));
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
        // gap: 10px;
    }
}
.remaining-time {
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: rgba(255, 255, 255, 0.521);
    visibility: hidden;
    &.visible {
        visibility: visible;
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
.majority-bar {
    position: relative;
    width: 100%;
    height: 10px;
    margin-top: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
}
.fill {
    position: absolute;
    top: 0;
    height: 100%;
    transition: width 0.2s ease-out;
    &.yes {
        left: 0;
        background: rgba(96, 216, 26, 0.6);
    }
    &.no {
        right: 0;
        background: rgba(165, 30, 30, 0.6);
    }
}
.finish-line {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 2px;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
}
.quorum-text {
    text-align: center;
    font-size: 14px;
    margin-top: 4px;
    opacity: 0.6;
    &.met {
        opacity: 0.9;
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
