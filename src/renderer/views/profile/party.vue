<!--
SPDX-FileCopyrightText: 2026 The BAR Lobby Authors

SPDX-License-Identifier: MIT
-->

<route lang="json5">
{ props: true, meta: { title: "Party", hide: true, transition: { name: "slide-left" } } }
</route>
<template>
    <div class="view">
        <div class="party-container">
            <div class="view-title">
                <h1>Party Central</h1>
            </div>
            <Panel no-padding>
                <TabView v-model:activeIndex="tabIndex">
                    <TabPanel header="Party" :disabled="!showParty">
                        <div class="flex-column gap-md">
                            <div class="flex-row members-header margin-bottom-lg">
                                <div class="flex-row members-list">
                                    <div class="flex-row gap-md">
                                        <h3>Members</h3>
                                        <div v-for="member in partyStore.activeParty?.members" :key="member.userId">
                                            <PartyMember :userId="member.userId" />
                                        </div>
                                    </div>
                                    <div class="flex-row gap-md" v-if="displayInvites()">
                                        <h3>Invites</h3>
                                        <div v-for="invite in partyStore.activeParty?.invited" :key="invite.userId">
                                            <PartyInvitee :userId="invite.userId" />
                                        </div>
                                    </div>
                                </div>
                                <Button @click="leaveParty" class="red margin-left-lg margin-right-lg">Leave Party</Button>
                            </div>
                            <div class="flex-row gap-md">
                                <div>
                                    <h3>Matchmaking Queues</h3>
                                    <div v-if="matchmakingStore.playlists.length > 0">
                                        <Button
                                            v-for="queue in availableQueueIds"
                                            :key="queue"
                                            @click="queueSelected(queue)"
                                            class="mm-queue-button classic"
                                            :class="{
                                                selected: matchmakingStore.selectedQueue === queue,
                                            }"
                                            :disabled="matchmakingStore.status !== MatchmakingStatus.Idle"
                                        >
                                            <span>{{ getPlaylistName(queue) }}</span>
                                            <div class="info br" v-if="matchmakingStore.selectedQueue === queue" @click.stop="onInfoClick">
                                                <Icon :icon="informationIcon"></Icon>
                                            </div>
                                        </Button>
                                    </div>
                                    <div v-else>
                                        <p>No known queues available.</p>
                                        <Button @click="requestMatchmakingQueues" class="blue">Request Queues</Button>
                                    </div>
                                    <div class="button-container">
                                        <div v-if="downloadsAreRequiredForSelected" class="download-button-container">
                                            <DownloadContentButton
                                                :maps="downloadsRequired.maps"
                                                :engines="downloadsRequired.engines"
                                                :games="downloadsRequired.games"
                                                @downloads-complete="handleDownloadsComplete"
                                                @downloads-started="handleDownloadsStarted"
                                                :class="'large'"
                                                >This string should never be visible.</DownloadContentButton
                                            >
                                        </div>
                                        <button
                                            v-else-if="matchmakingStore.status === MatchmakingStatus.Idle"
                                            class="quick-play-button"
                                            :class="{
                                                disabled: !matchmakingStore.selectedQueue,
                                            }"
                                            @click="matchmaking.sendQueueRequest"
                                        >
                                            {{ t("lobby.multiplayer.ranked.buttons.searchGame") }}
                                        </button>
                                        <button
                                            v-else-if="matchmakingStore.status === MatchmakingStatus.JoinRequested"
                                            class="quick-play-button searching"
                                            disabled
                                        >
                                            {{ t("lobby.multiplayer.ranked.buttons.joinRequested") }}
                                        </button>
                                        <button
                                            v-else-if="matchmakingStore.status === MatchmakingStatus.Searching"
                                            class="quick-play-button searching"
                                            disabled
                                        >
                                            {{ t("lobby.multiplayer.ranked.buttons.searchingForOpponent") }}
                                        </button>
                                        <button
                                            v-else-if="matchmakingStore.status === MatchmakingStatus.MatchFound"
                                            class="quick-play-button"
                                            @click="matchmaking.sendReadyRequest"
                                        >
                                            {{ t("lobby.multiplayer.ranked.buttons.matchFound") }}
                                        </button>
                                        <button
                                            v-else-if="matchmakingStore.status === MatchmakingStatus.MatchAccepted"
                                            class="quick-play-button"
                                            disabled
                                        >
                                            {{ t("lobby.multiplayer.ranked.buttons.accepted") }}
                                        </button>
                                        <button
                                            class="cancel-button"
                                            :disabled="matchmakingStore.status === MatchmakingStatus.Idle"
                                            :class="{
                                                disabled: matchmakingStore.status === MatchmakingStatus.Idle,
                                            }"
                                            @click="matchmaking.sendCancelRequest"
                                        >
                                            {{ t("lobby.multiplayer.ranked.buttons.cancel") }}
                                        </button>
                                        <p class="txt-error" v-if="matchmakingStore.errorMessage">{{ matchmakingStore.errorMessage }}</p>
                                    </div>
                                </div>
                                <PartyChat />
                            </div>
                        </div>
                    </TabPanel>
                    <TabPanel header="Invites" :disabled="!showInvites">
                        <div>
                            <div v-for="[partyId, party] of partyStore.parties" :key="partyId">
                                <div class="flex-col" v-if="party.invited.some((invitee) => invitee.userId === me.userId)">
                                    <div>
                                        Party invite received from:
                                        <span v-for="name in getPartyMemberNames(partyId)" :key="name" class="margin-right-sm">{{
                                            name
                                        }}</span>
                                    </div>
                                    <div class="flex-row padding-md">
                                        <Button @click="acceptInvite(partyId)" class="margin-right-md green">Accept</Button>
                                        <Button @click="declineInvite(partyId)" class="margin-left-md red">Decline</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>
            </Panel>
        </div>
        <QueueDownloadsModal
            v-model="isQueueDownloadsModalOpen"
            :title="t('lobby.multiplayer.ranked.modalTitle')"
            :queue="matchmakingStore.selectedQueue"
            @close-modal="isQueueDownloadsModalOpen = false"
        />
    </div>
</template>

<script lang="ts" setup>
import { useTypedI18n } from "@renderer/i18n";
import { partyStore, PlayersPartyState, party } from "@renderer/store/party.store";
import { computed, ref, watch, toRaw } from "vue";
import PartyChat from "@renderer/components/party/PartyChat.vue";
import Panel from "@renderer/components/common/Panel.vue";
import { PartyId } from "tachyon-protocol/types";
import Button from "@renderer/components/controls/Button.vue";
import { useRouter } from "vue-router";
const router = useRouter();
import PartyMember from "@renderer/components/party/PartyMember.vue";
import PartyInvitee from "@renderer/components/party/PartyInvitee.vue";
import { db } from "@renderer/store/db";
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";
import { UserId } from "tachyon-protocol/types";
import { User } from "@main/model/user";
import TabPanel from "primevue/tabpanel";
import TabView from "@renderer/components/common/TabView.vue";
import { me } from "@renderer/store/me.store";
import { matchmakingStore, matchmaking, MatchmakingStatus, getPlaylistName } from "@renderer/store/matchmaking.store";
import DownloadContentButton from "@renderer/components/controls/DownloadContentButton.vue";
import QueueDownloadsModal from "@renderer/components/misc/QueueDownloadsModal.vue";
import informationIcon from "@iconify-icons/mdi/information";
import { Icon } from "@iconify/vue";
const { t } = useTypedI18n();

const showInvites = computed(() => {
    if (partyStore.state === PlayersPartyState.InvitedOnly || partyStore.state === PlayersPartyState.JoinedAndInvited) return true;
    return false;
});
const showParty = computed(() => {
    if (partyStore.state === PlayersPartyState.JoinedOnly || partyStore.state === PlayersPartyState.JoinedAndInvited) return true;
    return false;
});

const tabIndex = ref(0);

watch(
    () => toRaw(partyStore.state),
    (newState) => {
        console.log("Party state changed:", newState);
        if (newState === PlayersPartyState.InvitedOnly) {
            console.log("Invited only");
            tabIndex.value = 1;
        } else if (newState === PlayersPartyState.JoinedOnly) {
            console.log("Joined only");
            tabIndex.value = 0;
        } else if (newState === PlayersPartyState.JoinedAndInvited) {
            console.log("Joined and invited");
            tabIndex.value = 0;
        } else if (newState === PlayersPartyState.None) {
            console.log("None");
            tabIndex.value = 1;
        }
    },
    { deep: true, immediate: true }
);

function acceptInvite(partyId: PartyId) {
    const data = { partyId: partyId };
    party.requestAcceptInvite(data);
}
function declineInvite(partyId: PartyId) {
    const data = { partyId: partyId };
    party.requestDeclineInvite(data);
}
async function leaveParty() {
    await party.requestLeave();
    if (partyStore.state === PlayersPartyState.None) {
        router.push("/play/menu");
    }
}
function getPartyMemberNames(partyId: PartyId) {
    const memberIds = partyStore.parties.get(partyId)?.members.map((member) => member.userId);
    const arr: string[] = [];
    if (!displayNames.value) return [];
    for (const userId of memberIds ?? []) {
        arr.push(displayNames.value.get(userId) ?? userId);
    }
    return arr;
}
const displayNames = useDexieLiveQueryWithDeps(partyStore.parties, async () => {
    const map = new Map<UserId, string>();
    await db.users
        .filter((user: User) => displayUsersFilter(user))
        .each(function (user) {
            map.set(user.userId, user.username);
        });
    return map;
});

function displayUsersFilter(user: User) {
    if (!user) return false;
    for (const party of partyStore.parties.values()) {
        if (party.members.some((member) => member.userId === user.userId)) return true;
    }
    return false;
}

const isQueueDownloadsModalOpen = ref(false);

const availableQueueIds = computed(() => {
    return matchmakingStore.playlists.sort((a, b) => a.teamSize * a.numOfTeams - b.teamSize * b.numOfTeams).map((playlist) => playlist.id);
});

const downloadsRequired = computed(() => {
    return matchmakingStore.downloadsRequired[matchmakingStore.selectedQueue];
});

const downloadsAreRequiredForSelected = computed(() => {
    // 0 returns falsy, anything else returns truthy, so this works to determine if there are any downloads required.
    return (
        matchmakingStore.downloadsRequired[matchmakingStore.selectedQueue].maps.length +
        matchmakingStore.downloadsRequired[matchmakingStore.selectedQueue].engines.length +
        matchmakingStore.downloadsRequired[matchmakingStore.selectedQueue].games.length
    );
});

const downloading = ref(false);

// Switching the active queue during a download cannot be allowed because it messes with state.
function queueSelected(queue: string) {
    if (downloading.value) {
        return;
    } else matchmakingStore.selectedQueue = queue;
}

function handleDownloadsStarted() {
    downloading.value = true;
}
// After downloads are done, we need to refresh the required list.
function handleDownloadsComplete() {
    matchmaking.triggerAssetsRefresh();
    downloading.value = false;
}

function requestMatchmakingQueues() {
    matchmaking.sendListRequest();
}

function onInfoClick() {
    if (!downloading.value) isQueueDownloadsModalOpen.value = true;
}
function displayInvites() {
    if (!partyStore.activeParty) return false;
    return partyStore.activeParty.invited.length > 0;
}
</script>

<style lang="scss" scoped>
.party-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 1600px;
    align-self: center;
}
.mm-queue-button {
    min-height: 100px;
    min-width: 400px;
    margin-top: 20px;
    margin-bottom: 20px;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    font-size: 2rem;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: all 0.3s ease;
    filter: brightness(0.7) saturate(0.1);
    span {
        font-size: 2rem;
        text-transform: uppercase;
        font-weight: bold;
        filter: drop-shadow(3px 3px 5px rgba(0, 0, 0, 0.8));
    }
    &.classic {
        background-image: url("/src/renderer/assets/images/backgrounds/5.jpg");
    }
}
/* On hover/active */
.mm-queue-button:hover {
    z-index: 1;
    filter: brightness(1);
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.5);
}
.mm-queue-button.selected {
    flex: 1.5;
    z-index: 1;
    filter: brightness(1);
    transform: scale(1.05);
    box-shadow: 0 0 10px 5px rgba(0, 0, 0, 0.5);
    border-color: white;
}

.download-button-container {
    align-self: center;
    width: 500px;
    //padding: 20px 40px;
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
}
.disabled {
    cursor: not-allowed;
    opacity: 0.1;
}
.info {
    position: absolute;
    font-size: 24px;
    font-weight: 600;
    padding: 2px 5px;
    transition: 0.2s opacity;
    opacity: 0.6;
    &.bl {
        bottom: 0px;
        left: 0px;
    }
    &.br {
        bottom: 10px;
        right: 0px;
        flex-wrap: wrap-reverse;
        justify-content: flex-end;
        max-width: 55%;
    }
}
.info:hover {
    opacity: 1;
}

.button-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-top: 40px;
    margin-bottom: 40px;
    flex-grow: 1;
}

.quick-play-button {
    align-self: center;
    width: 500px;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 2rem;
    padding: 20px 40px;
    color: #fff;
    background: linear-gradient(90deg, #22c55e, #16a34a);
    border: none;
    border-radius: 2px;
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.searching {
    animation: pulse 3s infinite ease-in-out;
}

.quick-play-button:hover {
    box-shadow: 0 0 25px rgba(34, 197, 94, 0.6);
}

.quick-play-button::before {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%) scale(0);
    border-radius: 50%;
    transition: transform 0.4s ease;
}

.quick-play-button:hover::before {
    box-shadow: 0 0 15px rgba(34, 197, 94, 0.4);
}

.cancel-button {
    align-self: center;
    width: 200px;
    text-transform: uppercase;
    font-family: Rajdhani;
    font-weight: bold;
    font-size: 1.5rem;
    padding: 20px 40px;
    color: #fff;
    // background: linear-gradient(90deg, #c52222, #a31616);
    border: none;
    border-radius: 2px;
    // box-shadow: 0 0 15px rgba(197, 34, 34, 0.4);
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
}

.cancel-button:hover {
    // box-shadow: 0 0 25px rgba(197, 34, 34, 0.6);
    color: #eee;
    // transform: scale(0.99);
    text-shadow: 0 0 25px rgba(255, 255, 255, 0.6);
}

.cancel-button::before {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 200%;
    height: 200%;
    background: rgba(105, 105, 105, 0.2);
    transform: translate(-50%, -50%) scale(0);
    border-radius: 50%;
    transition: transform 0.4s ease;
}
.download-button-container {
    align-self: center;
    width: 500px;
    //padding: 20px 40px;
    text-align: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
}
.members-header {
    justify-content: space-between;
}
.members-list {
    justify-content: space-evenly;
    flex-grow: 4;
}
</style>
