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
            <Panel class="flex-col flex-grow fullheight">
                <div v-if="showParty">
                    <div class="flex-row gap-md">
                        <div>
                            <Button @click="leaveParty" class="red">Leave Party</Button>
                            <h3>Party Members</h3>
                            <div v-for="member in partyStore.activeParty?.members" :key="member.userId">
                                <PartyMember :userId="member.userId" />
                            </div>
                            <h3>Party Invitations</h3>
                            <div v-for="invite in partyStore.activeParty?.invited" :key="invite.userId">
                                <PartyInvitee :userId="invite.userId" />
                            </div>
                        </div>
                        <PartyChat />
                    </div>
                </div>
                <div v-else-if="showInvites">
                    <div v-for="[partyId] of partyStore.parties" :key="partyId">
                        <div class="flex-col">
                            <div>
                                Party invite received from:
                                <span v-for="name in getPartyMemberNames(partyId)" :key="name" class="margin-right-sm">{{ name }}</span>
                            </div>
                            <div class="flex-row padding-md">
                                <Button @click="acceptInvite(partyId)" class="margin-right-md green">Accept</Button>
                                <Button @click="declineInvite(partyId)" class="margin-left-md red">Decline</Button>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <div class="flex-col">
                        <div>No active parties or invites.</div>
                    </div>
                </div>
            </Panel>
        </div>
    </div>
</template>

<script lang="ts" setup>
// import { useTypedI18n } from "@renderer/i18n";
import { partyStore, PlayersPartyState, party } from "@renderer/store/party.store";
import { computed } from "vue";
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
// const { t } = useTypedI18n();

const showInvites = computed(() => {
    if (partyStore.state === PlayersPartyState.InvitedOnly || partyStore.state === PlayersPartyState.JoinedAndInvited) return true;
    return false;
});
const showParty = computed(() => {
    if (partyStore.state === PlayersPartyState.JoinedOnly || partyStore.state === PlayersPartyState.JoinedAndInvited) return true;
    return false;
});

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
</script>

<style lang="scss" scoped>
.party-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 1600px;
    align-self: center;
}
</style>
