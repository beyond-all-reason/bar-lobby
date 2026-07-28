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
            <div v-if="stage !== 'section'" class="flex-row flex-center-items gap-sm">
                <Button class="slim square" @click="goBack">
                    <Icon :icon="arrowLeft" />
                </Button>
                <div class="summary">{{ summary }}</div>
            </div>

            <template v-if="stage === 'section'">
                <h4>{{ t("lobby.components.user.reportUser.reasonForReport") }}</h4>
                <div class="cards">
                    <div v-for="section in reportSections" :key="section.id" class="card" @click="selectSection(section.id)">
                        <Icon :icon="section.icon" height="36" />
                        <span>{{ t(section.labelKey) }}</span>
                    </div>
                </div>
            </template>

            <template v-else-if="stage === 'subType'">
                <h4>{{ t("lobby.components.user.reportUser.typeOfReport") }}</h4>
                <div class="cards">
                    <div v-for="subType in selectedSection?.subTypes" :key="subType.id" class="card" @click="selectSubType(subType.id)">
                        <Icon :icon="subType.icon" height="36" />
                        <span>{{ t(subType.labelKey) }}</span>
                    </div>
                </div>
            </template>

            <template v-else-if="stage === 'match'">
                <h4>{{ t("lobby.components.user.reportUser.whichMatch") }}</h4>
                <div>{{ t("lobby.components.user.reportUser.lobbyActionsHint") }}</div>
                <Loader v-if="isLoadingMatches" />
                <div v-else-if="!matches.length" class="note">{{ t("lobby.components.user.reportUser.noMatchesFound") }}</div>
                <div v-else class="matches">
                    <div v-for="match in matches" :key="match.id" class="match" @click="selectMatch(match)">
                        <div class="match-title">{{ matchLabel(match) }}</div>
                        <div class="note">{{ matchWhen(match) }} &middot; {{ getFriendlyDuration(match.durationMs) }}</div>
                    </div>
                </div>
                <Button class="fullwidth" @click="selectMatch(null)">
                    {{ t("lobby.components.user.reportUser.noMatch") }}
                </Button>
            </template>

            <template v-else>
                <div v-if="selectedMatch" class="match-details">
                    <div class="match-title">{{ matchLabel(selectedMatch) }}</div>
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

                <h4>{{ t("lobby.components.user.reportUser.extraInfo") }}</h4>
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
                    @keydown.enter.stop
                />
                <div class="note">{{ t("lobby.components.user.reportUser.specCheatingNote") }}</div>
                <Button class="fullwidth green" :disabled="!canSubmit" @click="submit">
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
import messageText from "@iconify-icons/mdi/message-text";
import swordCross from "@iconify-icons/mdi/sword-cross";
import { formatDistanceToNow } from "date-fns";

import Modal from "@renderer/components/common/Modal.vue";
import Loader from "@renderer/components/common/Loader.vue";
import Button from "@renderer/components/controls/Button.vue";
import Textarea from "@renderer/components/controls/Textarea.vue";
import ReportUserIcon from "@renderer/components/user/ReportUserIcon.vue";
import { notificationsApi } from "@renderer/api/notifications";
import { useTypedI18n } from "@renderer/i18n";
import { useReportUser } from "@renderer/composables/useReportUser";
import { users } from "@renderer/store/users.store";
import { getFriendlyDuration } from "@renderer/utils/misc";
import type { OnlineReplayDetails, OnlineReplayOverview } from "@main/content/replays/online-replays";

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

type ReportSection = (typeof reportSections)[number];
type Stage = "section" | "subType" | "match" | "details";

const { t } = useTypedI18n();
const { isOpen, reportedUser, closeReportUser } = useReportUser();

const stage = ref<Stage>("section");
const sectionId = ref<ReportSection["id"] | null>(null);
const subTypeId = ref<string | null>(null);
const matches = ref<OnlineReplayOverview[]>([]);
const isLoadingMatches = ref(false);
const selectedMatch = ref<OnlineReplayOverview | null>(null);
const matchDetails = ref<OnlineReplayDetails | null>(null);
const message = ref("");
const isSubmitting = ref(false);

const selectedSection = computed(() => reportSections.find((section) => section.id === sectionId.value));

const selectedSubType = computed(() => selectedSection.value?.subTypes.find((subType) => subType.id === subTypeId.value));

const summary = computed(() => {
    if (!selectedSection.value) return "";
    if (!selectedSubType.value) return t(selectedSection.value.labelKey);

    return `${t(selectedSection.value.labelKey)} / ${t(selectedSubType.value.labelKey)}`;
});

const matchTeams = computed(() => Map.groupBy(matchDetails.value?.players ?? [], (player) => player.allyTeamId));

const reportedUserSpectated = computed(() =>
    matchDetails.value?.spectators.some((spectator) => spectator.userId?.toString() === reportedUser.value?.userId)
);

const messageSuffix = computed(() => (selectedMatch.value ? `\nReplay: https://bar-rts.com/replays/${selectedMatch.value.id}` : ""));

const maxDescriptionLength = computed(() => maxMessageLength - messageSuffix.value.length);

const canSubmit = computed(() => Boolean(reportedUser.value && selectedSubType.value && message.value.trim() && !isSubmitting.value));

watch(isOpen, (open) => {
    stage.value = "section";
    sectionId.value = null;
    subTypeId.value = null;
    matches.value = [];
    selectedMatch.value = null;
    matchDetails.value = null;
    message.value = "";
    isSubmitting.value = false;

    if (!open) {
        reportedUser.value = null;
    }
});

function selectSection(id: ReportSection["id"]) {
    sectionId.value = id;
    stage.value = "subType";
}

async function selectSubType(id: string) {
    subTypeId.value = id;
    stage.value = "match";

    if (!reportedUser.value) return;

    isLoadingMatches.value = true;
    matches.value = await window.replays.searchOnlineByPlayer(reportedUser.value.username, matchesToList);
    isLoadingMatches.value = false;
}

async function selectMatch(match: OnlineReplayOverview | null) {
    selectedMatch.value = match;
    matchDetails.value = null;
    stage.value = "details";

    if (!match) return;

    matchDetails.value = await window.replays.getOnline(match.id);
}

function goBack() {
    if (stage.value === "details") stage.value = "match";
    else if (stage.value === "match") stage.value = "subType";
    else stage.value = "section";
}

function matchLabel(match: OnlineReplayOverview) {
    const sizes = match.allyTeamSizes;
    if (sizes.length === 2) {
        return t("lobby.components.user.reportUser.matchTeams", { left: sizes[0], right: sizes[1], map: match.mapName });
    }

    return t("lobby.components.user.reportUser.matchFfa", { teams: sizes.length, map: match.mapName });
}

function matchWhen(match: OnlineReplayOverview) {
    return t("lobby.components.user.reportUser.matchWhen", { ago: formatDistanceToNow(new Date(match.startTime)) });
}

async function submit() {
    if (!canSubmit.value) return;

    isSubmitting.value = true;
    const reported = await users.requestReportUsers({
        userIds: [reportedUser.value!.userId],
        reason: { type: `${sectionId.value}/${subTypeId.value}` },
        message: `${message.value.trim()}${messageSuffix.value}`,
    });
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
    overflow-y: auto;
    padding: 10px;
}
.cards {
    display: flex;
    flex-direction: row;
    gap: 10px;
}
.card {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 15px 10px;
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
}
.matches {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.match {
    padding: 5px 10px;
    background: rgba(255, 255, 255, 0.1);
    &:hover {
        background: rgba(255, 255, 255, 0.2);
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
.summary {
    font-weight: 600;
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
