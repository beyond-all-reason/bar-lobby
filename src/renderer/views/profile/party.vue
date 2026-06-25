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
                        <div>
                            <div class="flex-row gap-md">
                                <div>
                                    <Button @click="leaveParty" class="red">Leave Party</Button>
                                    <h3>Party Members</h3>
                                    <div v-for="member in partyStore.activeParty?.members" :key="member.userId">
                                        <PartyMember :userId="member.userId" />
                                    </div>
                                    <h3>Pending Invitations</h3>
                                    <div v-for="invite in partyStore.activeParty?.invited" :key="invite.userId">
                                        <PartyInvitee :userId="invite.userId" />
                                    </div>
                                </div>
                                <div>
                                    <h3>Matchmaking Queues</h3>
                                    <div>
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
</style>
