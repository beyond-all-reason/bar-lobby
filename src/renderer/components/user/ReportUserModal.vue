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
                <Button v-if="stage !== 'reason' && stage !== 'success'" class="inline back" @click="goBack">
                    <Icon :icon="arrowLeft" />
                </Button>
                <h4 class="step-title">{{ t(stepTitleKey) }}</h4>
            </div>

            <template v-if="stage === 'reason'">
                <div class="cards">
                    <div v-for="section in reportSections" :key="section.id" class="card" @click="selectReason(section.id)">
                        <Icon :icon="section.icon" height="40" />
                        <span class="card-title">{{ t(section.labelKey) }}</span>
                        <span class="note">{{ t(section.blurbKey) }}</span>
                    </div>
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

            <template v-else-if="stage === 'details'">
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

                <div class="evidence">
                    <Button class="slim evidence-picker" @click="selectEvidence">
                        <Icon :icon="paperclip" height="18" />
                        <span class="margin-left-sm">{{
                            t("lobby.components.user.reportUser.attachEvidence", { max: maxEvidenceFiles })
                        }}</span>
                    </Button>
                    <div v-for="file in evidenceFiles" :key="file" class="evidence-file">
                        <span class="evidence-name">{{ fileName(file) }}</span>
                        <Button class="inline" @click="removeEvidence(file)">
                            <Icon :icon="cancel" height="16" />
                        </Button>
                    </div>
                </div>

                <div class="step-action">
                    <Button v-if="isChatReport" class="fullwidth green" :disabled="!detailsComplete" @click="continueFromDetails">
                        {{ t("lobby.components.user.reportUser.continue") }}
                    </Button>
                    <Button v-else type="submit" class="fullwidth green" :disabled="!canSubmit">
                        {{ t("lobby.components.user.reportUser.submit") }}
                    </Button>
                </div>
            </template>

            <template v-else-if="stage === 'chat'">
                <div>{{ t("lobby.components.user.reportUser.chatHint") }}</div>
                <div class="chat-list">
                    <div v-if="!chatLines.length" class="chat-list-message note">
                        {{ t("lobby.components.user.reportUser.noChatAvailable") }}
                    </div>
                    <div
                        v-for="conversation in chatConversations"
                        v-else
                        :key="conversation.key"
                        class="conversation"
                        :class="{ origin: conversation.key === originConversationKey }"
                    >
                        <div class="conversation-label">
                            {{ conversation.label }}
                            <span v-if="conversation.key === originConversationKey" class="note">
                                {{ t("lobby.components.user.reportUser.chatReportedFrom") }}
                            </span>
                        </div>
                        <div
                            v-for="line in conversation.lines"
                            :key="line.key"
                            class="chat-line"
                            @click="toggleChatLine(line.key, !selectedChatKeys.includes(line.key))"
                        >
                            <Checkbox :modelValue="selectedChatKeys.includes(line.key)" />
                            <span class="note chat-time">{{ lineTime(line.timestamp) }}</span>
                            <span class="chat-text">{{ line.text }}</span>
                        </div>
                    </div>
                </div>
                <div class="step-action">
                    <Button type="submit" class="fullwidth green" :disabled="!canSubmit">
                        {{ t("lobby.components.user.reportUser.submit") }}
                    </Button>
                </div>
            </template>

            <template v-else>
                <div class="success">
                    <Icon :icon="checkCircle" height="48" />
                    <div>{{ t("lobby.components.user.reportUser.submitted") }}</div>
                    <div class="note">{{ t("lobby.components.user.reportUser.submittedFollowUp") }}</div>
                </div>
                <Button class="fullwidth" @click="closeReportUser">
                    {{ t("lobby.components.user.reportUser.close") }}
                </Button>
            </template>
        </div>
    </Modal>
</template>

<script lang="ts" setup>
import { computed, ref, toRaw, watch } from "vue";
import { Icon } from "@iconify/vue";
import arrowLeft from "@iconify-icons/mdi/arrow-left";
import messageText from "@iconify-icons/mdi/message-text";
import swordCross from "@iconify-icons/mdi/sword-cross";
import cancel from "@iconify-icons/mdi/cancel";
import paperclip from "@iconify-icons/mdi/paperclip";
import checkCircle from "@iconify-icons/mdi/check-circle-outline";
import { formatDistanceToNow } from "date-fns";

import Modal from "@renderer/components/common/Modal.vue";
import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";
import ReportUserIcon from "@renderer/components/user/ReportUserIcon.vue";
import { catchIpcFailure } from "@renderer/api/ipc-result";
import { useTypedI18n } from "@renderer/i18n";
import { useReportUser } from "@renderer/composables/useReportUser";
import { users } from "@renderer/store/users.store";
import { getFriendlyDuration } from "@renderer/utils/misc";
import type { OnlineReplayDetails, OnlineReplayOverview } from "@main/replays/online-replays";

import { configStore } from "@renderer/store/config.store";
import { chatStore } from "@renderer/store/chat.store";
import Checkbox from "@renderer/components/controls/Checkbox.vue";
import type { UserId } from "tachyon-protocol/types";
import type { Message } from "@renderer/model/message";

// The website report form stores a type and a sub type per report, and caps its description at 255
// characters. Tachyon only carries a single reason string, so the two are joined for the wire.
const maxMessageLength = 255;
const matchesToList = 10;
const maxEvidenceFiles = 3;

const reportSections = [
    {
        id: "chat",
        labelKey: "lobby.components.user.reportUser.sections.chat",
        blurbKey: "lobby.components.user.reportUser.sections.chatBlurb",
        icon: messageText,
    },
    {
        id: "actions",
        labelKey: "lobby.components.user.reportUser.sections.actions",
        blurbKey: "lobby.components.user.reportUser.sections.actionsBlurb",
        icon: swordCross,
    },
] as const;

type ReportSection = (typeof reportSections)[number];
type Stage = "reason" | "match" | "details" | "chat" | "success";

type ChatLine = {
    key: string;
    userId: UserId;
    text: string;
    timestamp: number;
    conversationKey: string;
    // Stands in for a message id until beyond-all-reason/tachyon#155 gives messages one.
    message: Message;
};

const { t } = useTypedI18n();
const { isOpen, reportedUser, reportedMessage, closeReportUser } = useReportUser();

const stage = ref<Stage>("reason");
const sectionId = ref<ReportSection["id"] | null>(null);
const matches = ref<OnlineReplayOverview[]>([]);
const isLoadingMatches = ref(false);
const searchFailed = ref(false);
const selectedMatch = ref<OnlineReplayOverview | null>(null);
const matchDetails = ref<OnlineReplayDetails | null>(null);
const message = ref("");
const isSubmitting = ref(false);
const selectedChatKeys = ref<string[]>([]);
const evidenceFiles = ref<string[]>([]);

// Responses that arrive after the user has moved on, or after the modal was reopened on someone
// else, must not overwrite what is on screen now.
let searchRequestId = 0;
let detailsRequestId = 0;
let submitRequestId = 0;

const selectedSection = computed(() => reportSections.find((section) => section.id === sectionId.value));

const stepTitleKeys = {
    reason: "lobby.components.user.reportUser.reasonForReport",
    match: "lobby.components.user.reportUser.whichMatch",
    details: "lobby.components.user.reportUser.extraInfo",
    chat: "lobby.components.user.reportUser.whichMessages",
    success: "lobby.components.user.reportUser.reportSubmitted",
} as const;

const stepTitleKey = computed(() => stepTitleKeys[stage.value]);

const matchTeams = computed(() => Map.groupBy(matchDetails.value?.players ?? [], (player) => player.allyTeamId));

function lineTime(timestamp: number) {
    return new Date(timestamp / 1000).toLocaleTimeString();
}

// Only what this session is holding. Tachyon has no durable id for a message and no way to fetch
// history, so selections stay in the client until beyond-all-reason/tachyon#155 lands.
const reportedConversations = computed(() => {
    const sources = [
        ...[...chatStore.lobbyChats].map(([id, messages]) => ({
            key: `lobby:${id}`,
            label: t("lobby.components.user.reportUser.chatLobby"),
            messages,
        })),
        ...[...chatStore.partyChats].map(([id, messages]) => ({
            key: `party:${id}`,
            label: t("lobby.components.user.reportUser.chatParty"),
            messages,
        })),
        ...[...chatStore.userChats].map(([id, messages]) => ({
            key: `player:${id}`,
            label: t("lobby.components.user.reportUser.chatDirect"),
            messages,
        })),
    ];

    return sources
        .map(({ key, label, messages }) => ({
            key,
            label,
            lines: messages
                .map((message, index) => ({
                    key: `${key}:${index}`,
                    userId: message.source.userId,
                    text: message.message,
                    timestamp: message.timestamp,
                    conversationKey: key,
                    message,
                }))
                .filter((line) => line.userId === reportedUser.value?.userId)
                .sort((a, b) => a.timestamp - b.timestamp),
        }))
        .filter((conversation) => conversation.lines.length > 0);
});

// Reading a ref hands back a reactive wrapper, so the raw objects are what can be compared.
function isReportedMessage(message: Message) {
    return reportedMessage.value !== null && toRaw(message) === toRaw(reportedMessage.value);
}

const originConversationKey = computed(
    () =>
        reportedConversations.value.find((conversation) => conversation.lines.some((line) => isReportedMessage(line.message)))?.key ?? null
);

// Whichever conversation the report was opened from leads, since that is the one being complained
// about. The rest follow by how recently they were active.
const chatConversations = computed(() => {
    const lastSpoke = (conversation: { lines: ChatLine[] }) => conversation.lines[conversation.lines.length - 1]?.timestamp ?? 0;

    return [...reportedConversations.value].sort((a, b) => {
        if (a.key === originConversationKey.value) return -1;
        if (b.key === originConversationKey.value) return 1;

        return lastSpoke(b) - lastSpoke(a);
    });
});

const chatLines = computed<ChatLine[]>(() => chatConversations.value.flatMap((conversation) => conversation.lines));

const preselectedChatKey = computed(() => chatLines.value.find((line) => isReportedMessage(line.message))?.key ?? null);

const reportedUserSpectated = computed(() =>
    matchDetails.value?.spectators.some((spectator) => spectator.userId?.toString() === reportedUser.value?.userId)
);

const messageSuffix = computed(() => (selectedMatch.value ? `\nReplay: ${configStore.replayServiceUrl}/${selectedMatch.value.id}` : ""));

const maxDescriptionLength = computed(() => maxMessageLength - messageSuffix.value.length);

const detailsComplete = computed(() => Boolean(reportedUser.value && selectedSection.value && message.value.trim() && !isSubmitting.value));

const isChatReport = computed(() => sectionId.value === "chat");

const canSubmit = computed(() => detailsComplete.value);

watch(maxDescriptionLength, (limit) => {
    message.value = message.value.slice(0, limit);
});

watch(isOpen, (open) => {
    searchRequestId++;
    detailsRequestId++;
    submitRequestId++;
    stage.value = "reason";
    sectionId.value = null;
    matches.value = [];
    searchFailed.value = false;
    selectedMatch.value = null;
    matchDetails.value = null;
    message.value = "";
    isSubmitting.value = false;
    selectedChatKeys.value = preselectedChatKey.value ? [preselectedChatKey.value] : [];
    evidenceFiles.value = [];

    if (!open) {
        reportedUser.value = null;
    }
});

async function selectReason(section: ReportSection["id"]) {
    sectionId.value = section;
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

const backStages = {
    match: "reason",
    details: "match",
    chat: "details",
} as const;

function goBack() {
    const previous = backStages[stage.value as keyof typeof backStages];
    if (previous) stage.value = previous;
}

function continueFromDetails() {
    if (!detailsComplete.value) return;

    stage.value = "chat";
}

function toggleChatLine(key: string, selected: boolean) {
    selectedChatKeys.value = selected ? [...selectedChatKeys.value, key] : selectedChatKeys.value.filter((entry) => entry !== key);
}

function fileName(filePath: string) {
    return filePath.split(/[/\\]/).pop() ?? filePath;
}

// Nothing carries these to the server yet, so they are held only to keep the flow whole.
async function selectEvidence() {
    const picked = await window.paths.selectImages();
    if (!picked.length) return;

    evidenceFiles.value = [...new Set([...evidenceFiles.value, ...picked])].slice(0, maxEvidenceFiles);
}

function removeEvidence(filePath: string) {
    evidenceFiles.value = evidenceFiles.value.filter((file) => file !== filePath);
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
        reason: { type: sectionId.value! },
        message: `${message.value.trim()}${messageSuffix.value}`,
    });

    if (requestId !== submitRequestId) return;

    isSubmitting.value = false;

    if (!reported) return;

    stage.value = "success";
}
</script>

<style lang="scss" scoped>
.container {
    width: min(860px, 78vw);
    max-height: min(720px, 78vh);
    gap: 20px;
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
.cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}
.card-title {
    font-weight: 600;
    font-size: 17px;
}
.card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 160px;
    padding: 20px 15px;
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
ul {
    padding-left: 20px;
    list-style: disc;
}
.note {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
}
.evidence {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.evidence > .evidence-picker {
    align-self: flex-start;
    :deep(.p-button) {
        padding: 7px 14px;
    }
}
.evidence-file {
    display: flex;
    align-items: center;
    gap: 6px;
}
.evidence-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.chat-list {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
}
.chat-list-message {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: 20px;
    text-align: center;
}
// One grid per conversation so the time column settles at the same width for every row in it,
// whatever the locale renders.
.conversation {
    display: grid;
    grid-template-columns: auto auto 1fr;
}
.conversation-label {
    position: sticky;
    top: 0;
    z-index: 1;
    grid-column: 1 / -1;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 5px 10px;
    background: rgb(38, 38, 38);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    text-transform: uppercase;
    font-weight: 600;
    font-size: 13px;
}
.conversation.origin .conversation-label {
    color: rgb(243, 213, 79);
}
.chat-time {
    justify-self: end;
    font-variant-numeric: tabular-nums;
}
.chat-line {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: subgrid;
    align-items: center;
    gap: 10px;
    padding: 3px 10px;
    cursor: pointer;
    user-select: none;
    &:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    :deep(.check-wrapper) {
        min-height: 20px;
        max-height: 20px;
        min-width: 20px;
        max-width: 20px;
    }
}
.chat-author {
    font-weight: 600;
    flex: 0 0 auto;
}
.chat-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
// The step content scrolls inside a fixed height panel, so the action stays reachable and needs a
// solid backing for what passes underneath it.
.step-action {
    position: sticky;
    bottom: 0;
    margin-top: auto;
    padding-top: 10px;
    background: rgb(23, 23, 23);
}
.success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin: auto 0;
    text-align: center;
}
</style>
