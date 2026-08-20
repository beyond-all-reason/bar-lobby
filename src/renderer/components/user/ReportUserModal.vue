<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<template>
    <Modal v-model="isOpen" @submit="submit">
        <template #title>
            <div class="flex-row flex-center-items gap-sm">
                <ReportUserIcon />
                {{ t("lobby.components.user.reportUser.title", { username: reportedUser?.username }) }}
            </div>
        </template>
        <div class="container flex-col gap-md">
            <div class="step-header">
                <Button v-if="stage !== 'reason'" class="inline back" @click="goBack">
                    <Icon :icon="arrowLeft" />
                </Button>
                <h4 class="step-title">{{ t(stepTitleKey) }}</h4>
            </div>

            <template v-if="stage === 'reason'">
                <div class="sections">
                    <div v-for="section in reportSections" :key="section.id" class="section">
                        <div class="section-header">
                            <Icon :icon="section.icon" height="20" />
                            {{ t(section.labelKey) }}
                        </div>
                        <div class="cards">
                            <div
                                v-for="subType in section.subTypes"
                                :key="subType.id"
                                class="card"
                                @click="selectReason(section.id, subType.id)"
                            >
                                <Icon :icon="subType.icon" height="30" />
                                <span>{{ t(subType.labelKey) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="relationship-actions">
                    <span v-for="action in relationshipActions" :key="action.id" v-tooltip.top="t(action.tooltipKey)">
                        <Button class="slim" :disabled="true">
                            <Icon :icon="action.icon" />
                            <span class="margin-left-sm">{{ t(action.labelKey) }}</span>
                        </Button>
                    </span>
                </div>
            </template>

            <template v-else-if="stage === 'match'">
                <div>{{ t("lobby.components.user.reportUser.lobbyActionsHint") }}</div>
                <div class="match-list">
                    <div class="match-row match-list-header">
                        <div>{{ t("lobby.components.user.reportUser.columnMatch") }}</div>
                        <div>{{ t("lobby.components.user.reportUser.columnMap") }}</div>
                        <div>{{ t("lobby.components.user.reportUser.columnWhen") }}</div>
                        <div>{{ t("lobby.components.user.reportUser.columnLength") }}</div>
                    </div>
                    <div v-if="isLoadingMatches" class="match-list-message">
                        <Loader :absolutePosition="false" />
                        <div class="note">{{ t("lobby.components.user.reportUser.fetchingMatches") }}</div>
                    </div>
                    <div v-else-if="searchFailed" class="match-list-message note">
                        {{ t("lobby.components.user.reportUser.matchesFailed") }}
                    </div>
                    <div v-else-if="!matches.length" class="match-list-message note">
                        {{ t("lobby.components.user.reportUser.noMatchesFound") }}
                    </div>
                    <div v-for="match in matches" v-else :key="match.id" class="match-row match" @click="selectMatch(match)">
                        <div>{{ matchSize(match) }}</div>
                        <div>{{ match.mapName }}</div>
                        <div class="note">{{ matchWhen(match) }}</div>
                        <div class="note">{{ getFriendlyDuration(match.durationMs) }}</div>
                    </div>
                </div>
                <Button class="fullwidth" @click="selectMatch(null)">
                    {{ t("lobby.components.user.reportUser.noMatch") }}
                </Button>
            </template>

            <template v-else>
                <div v-if="selectedMatch" class="match-details">
                    <div class="match-title">
                        {{
                            t("lobby.components.user.reportUser.matchOnMap", {
                                match: matchSize(selectedMatch),
                                map: selectedMatch.mapName,
                            })
                        }}
                    </div>
                    <div class="note">
                        {{ matchWhen(selectedMatch) }} &middot; {{ getFriendlyDuration(selectedMatch.durationMs) }}
                        <template v-if="matchDetails?.preset"> &middot; {{ matchDetails.preset }}</template>
                    </div>
                    <div v-if="matchDetails" class="teams">
                        <div v-for="[allyTeamId, players] in matchTeams" :key="allyTeamId" class="team">
                            <div class="note">
                                {{ t("lobby.components.user.reportUser.team", { team: allyTeamId + 1 }) }}
                                <template v-if="players[0]?.winningTeam">
                                    &middot; {{ t("lobby.components.user.reportUser.winner") }}
                                </template>
                            </div>
                            <div class="players">
                                <span
                                    v-for="player in players"
                                    :key="player.name"
                                    :class="{ reported: player.userId?.toString() === reportedUser?.userId }"
                                >
                                    {{ player.name }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div v-if="reportedUserSpectated" class="note">{{ t("lobby.components.user.reportUser.wasSpectating") }}</div>
                </div>

                <div>
                    {{ t("lobby.components.user.reportUser.blurb") }}
                    <ul>
                        <li>{{ t("lobby.components.user.reportUser.guidanceDescription") }}</li>
                        <li>{{ t("lobby.components.user.reportUser.guidanceTimestamps") }}</li>
                    </ul>
                </div>
                <Textarea
                    v-model="message"
                    :placeholder="t('lobby.components.user.reportUser.messagePlaceholder')"
                    :rows="4"
                    :maxlength="maxDescriptionLength"
                />
                <div class="note">{{ t("lobby.components.user.reportUser.specCheatingNote") }}</div>
                <Button type="submit" class="fullwidth green" :disabled="!canSubmit">
                    {{ t("lobby.components.user.reportUser.submit") }}
                </Button>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import arrowLeft from "@iconify-icons/mdi/arrow-left";
import accountAlert from "@iconify-icons/mdi/account-alert";
import alertOutline from "@iconify-icons/mdi/alert-outline";
import cardsPlaying from "@iconify-icons/mdi/cards-playing-outline";
import chevronDoubleUp from "@iconify-icons/mdi/chevron-double-up";
import dotsHorizontal from "@iconify-icons/mdi/dots-horizontal";
import emoticonAngry from "@iconify-icons/mdi/emoticon-angry-outline";
import emailMultiple from "@iconify-icons/mdi/email-multiple";
import handBackRight from "@iconify-icons/mdi/hand-back-right";
import messageText from "@iconify-icons/mdi/message-text";
import microphoneOff from "@iconify-icons/mdi/microphone-off";
import swordCross from "@iconify-icons/mdi/sword-cross";
import cancel from "@iconify-icons/mdi/cancel";
import { formatDistanceToNow } from "date-fns";

import Modal from "@renderer/components/common/Modal.vue";
import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";
import ReportUserIcon from "@renderer/components/user/ReportUserIcon.vue";
import { catchIpcFailure } from "@renderer/api/ipc-result";
import { notificationsApi } from "@renderer/api/notifications";
import { useTypedI18n } from "@renderer/i18n";
import { useReportUser } from "@renderer/composables/useReportUser";
import { users } from "@renderer/store/users.store";
import { getFriendlyDuration } from "@renderer/utils/misc";
import type { OnlineReplayDetails, OnlineReplayOverview } from "@main/replays/online-replays";

import { configStore } from "@renderer/store/config.store";

// The website report form stores a type and a sub type per report, and caps its description at 255
// characters. Tachyon only carries a single reason string, so the two are joined for the wire.
const maxMessageLength = 255;
const matchesToList = 10;

const reportSections = [
    {
        id: "chat",
        labelKey: "lobby.components.user.reportUser.sections.chat",
        icon: messageText,
        subTypes: [
            { id: "spam", labelKey: "lobby.components.user.reportUser.reasons.chat.spam", icon: emailMultiple },
            { id: "bullying", labelKey: "lobby.components.user.reportUser.reasons.chat.bullying", icon: accountAlert },
            { id: "hate", labelKey: "lobby.components.user.reportUser.reasons.chat.hate", icon: alertOutline },
            { id: "other", labelKey: "lobby.components.user.reportUser.reasons.chat.other", icon: dotsHorizontal },
        ],
    },
    {
        id: "actions",
        labelKey: "lobby.components.user.reportUser.sections.actions",
        icon: swordCross,
        subTypes: [
            { id: "noob", labelKey: "lobby.components.user.reportUser.reasons.actions.noob", icon: chevronDoubleUp },
            { id: "griefing", labelKey: "lobby.components.user.reportUser.reasons.actions.griefing", icon: emoticonAngry },
            { id: "cheating", labelKey: "lobby.components.user.reportUser.reasons.actions.cheating", icon: cardsPlaying },
            { id: "other", labelKey: "lobby.components.user.reportUser.reasons.actions.other", icon: dotsHorizontal },
        ],
    },
] as const;

// Ignore, avoid and block exist on the website report page, but tachyon has no command for any of
// them, so they stay disabled until the protocol grows one.
const relationshipActions = [
    {
        id: "ignore",
        labelKey: "lobby.components.user.reportUser.relationships.ignore",
        tooltipKey: "lobby.components.user.reportUser.relationships.ignoreTooltip",
        icon: microphoneOff,
    },
    {
        id: "avoid",
        labelKey: "lobby.components.user.reportUser.relationships.avoid",
        tooltipKey: "lobby.components.user.reportUser.relationships.avoidTooltip",
        icon: cancel,
    },
    {
        id: "block",
        labelKey: "lobby.components.user.reportUser.relationships.block",
        tooltipKey: "lobby.components.user.reportUser.relationships.blockTooltip",
        icon: handBackRight,
    },
] as const;

type ReportSection = (typeof reportSections)[number];
type Stage = "reason" | "match" | "details";

const { t } = useTypedI18n();
const { isOpen, reportedUser, closeReportUser } = useReportUser();

const stage = ref<Stage>("reason");
const sectionId = ref<ReportSection["id"] | null>(null);
const subTypeId = ref<string | null>(null);
const matches = ref<OnlineReplayOverview[]>([]);
const isLoadingMatches = ref(false);
const searchFailed = ref(false);
const selectedMatch = ref<OnlineReplayOverview | null>(null);
const matchDetails = ref<OnlineReplayDetails | null>(null);
const message = ref("");
const isSubmitting = ref(false);

// Responses that arrive after the user has moved on, or after the modal was reopened on someone
// else, must not overwrite what is on screen now.
let searchRequestId = 0;
let detailsRequestId = 0;
let submitRequestId = 0;

const selectedSection = computed(() => reportSections.find((section) => section.id === sectionId.value));

const selectedSubType = computed(() => selectedSection.value?.subTypes.find((subType) => subType.id === subTypeId.value));

const stepTitleKeys = {
    reason: "lobby.components.user.reportUser.reasonForReport",
    match: "lobby.components.user.reportUser.whichMatch",
    details: "lobby.components.user.reportUser.extraInfo",
} as const;

const stepTitleKey = computed(() => stepTitleKeys[stage.value]);

const matchTeams = computed(() => Map.groupBy(matchDetails.value?.players ?? [], (player) => player.allyTeamId));

const reportedUserSpectated = computed(() =>
    matchDetails.value?.spectators.some((spectator) => spectator.userId?.toString() === reportedUser.value?.userId)
);

const messageSuffix = computed(() => (selectedMatch.value ? `\nReplay: ${configStore.replayServiceUrl}/${selectedMatch.value.id}` : ""));

const maxDescriptionLength = computed(() => maxMessageLength - messageSuffix.value.length);

const canSubmit = computed(() => Boolean(reportedUser.value && selectedSubType.value && message.value.trim() && !isSubmitting.value));

watch(maxDescriptionLength, (limit) => {
    message.value = message.value.slice(0, limit);
});

watch(isOpen, (open) => {
    searchRequestId++;
    detailsRequestId++;
    submitRequestId++;
    stage.value = "reason";
    sectionId.value = null;
    subTypeId.value = null;
    matches.value = [];
    searchFailed.value = false;
    selectedMatch.value = null;
    matchDetails.value = null;
    message.value = "";
    isSubmitting.value = false;

    if (!open) {
        reportedUser.value = null;
    }
});

async function selectReason(section: ReportSection["id"], subType: string) {
    sectionId.value = section;
    subTypeId.value = subType;
    stage.value = "match";

    if (!reportedUser.value) return;

    const requestId = ++searchRequestId;
    searchFailed.value = false;
    isLoadingMatches.value = true;
    const found = await catchIpcFailure(() => window.replays.searchOnlineByPlayer(reportedUser.value!.username, matchesToList));

    if (requestId !== searchRequestId) return;

    isLoadingMatches.value = false;

    if (found.status === "failed") {
        searchFailed.value = true;
        return;
    }

    matches.value = found.data;
}

async function selectMatch(match: OnlineReplayOverview | null) {
    const requestId = ++detailsRequestId;
    selectedMatch.value = match;
    matchDetails.value = null;
    stage.value = "details";

    if (!match) return;

    const details = await catchIpcFailure(() => window.replays.getOnline(match.id));

    if (requestId !== detailsRequestId) return;

    matchDetails.value = details.status === "success" ? details.data : null;
}

function goBack() {
    stage.value = stage.value === "details" ? "match" : "reason";
}

function matchSize(match: OnlineReplayOverview) {
    const sizes = match.allyTeamSizes;
    if (sizes.length === 2) {
        return t("lobby.components.user.reportUser.matchTeams", { left: sizes[0], right: sizes[1] });
    }

    return t("lobby.components.user.reportUser.matchFfa", { teams: sizes.length });
}

function matchWhen(match: OnlineReplayOverview) {
    const startTime = new Date(match.startTime);
    if (Number.isNaN(startTime.getTime())) {
        return t("lobby.components.user.reportUser.matchWhenUnknown");
    }

    return t("lobby.components.user.reportUser.matchWhen", { ago: formatDistanceToNow(startTime) });
}

async function submit() {
    if (!canSubmit.value) return;

    const requestId = ++submitRequestId;
    isSubmitting.value = true;
    const reported = await users.requestReportUsers({
        userIds: [reportedUser.value!.userId],
        reason: { type: `${sectionId.value}/${subTypeId.value}` },
        message: `${message.value.trim()}${messageSuffix.value}`,
    });

    if (requestId !== submitRequestId) return;

    isSubmitting.value = false;

    if (!reported) return;

    notificationsApi.alert({ text: t("lobby.components.user.reportUser.submitted"), severity: "info" });
    closeReportUser();
}
</script>

<style lang="scss" scoped>
.container {
    width: 620px;
    height: 460px;
    gap: 30px;
    overflow-y: auto;
    padding: 10px;
}
// Matching side tracks keep the title centred whether or not the back button is there, and a fixed
// height stops the wizard shifting what sits below it.
.step-header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    min-height: 33px;
}
.back {
    grid-column: 1;
    justify-self: start;
}
.step-title {
    grid-column: 2;
    font-size: 20px;
}
.sections {
    display: flex;
    flex-direction: row;
    gap: 20px;
}
.section {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
}
.section-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 5px;
    padding-bottom: 5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    font-weight: 600;
}
.cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}
.card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 100px;
    padding: 15px 10px;
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
}
.match-list {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
}
.match-row {
    display: grid;
    grid-template-columns: 80px 1fr 110px 70px;
    gap: 10px;
    padding: 5px 10px;
}
.match-list-header {
    background: rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    font-weight: 600;
}
.match-list-message {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 20px;
    text-align: center;
}
.match {
    &:hover {
        background: rgba(255, 255, 255, 0.15);
    }
}
.match-details {
    padding: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
}
.match-title {
    font-weight: 600;
}
.teams {
    display: flex;
    flex-direction: row;
    gap: 15px;
    margin-top: 10px;
}
.team {
    flex: 1;
}
.players {
    display: flex;
    flex-direction: column;
    font-size: 14px;
    .reported {
        color: rgb(243, 213, 79);
        font-weight: 600;
    }
}
.relationship-actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 25px;
    margin-top: auto;
}
ul {
    padding-left: 20px;
    list-style: disc;
}
.note {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
}
</style>
