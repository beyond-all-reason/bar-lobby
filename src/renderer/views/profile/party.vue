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
                            <h2>Party Information</h2>
                            <p>
                                Current members: {{ partyStore.activeParty?.members.length || 0 }} /
                                {{ partyStore.activeParty?.maxMembers || 0 }}
                            </p>
                            <p>Active invitations: {{ partyStore.activeParty?.invited.length || 0 }}</p>
                            <Button @click="leaveParty">Leave Party</Button>
                        </div>
                        <PartyChat />
                    </div>
                </div>
                <div v-else-if="showInvites">
                    <div v-for="[partyId, party] of partyStore.parties" :key="partyId">
                        <span>{{ party.id }} with {{ party.members.length }} members</span>
                        <Button @click="acceptInvite(partyId)">Accept</Button>
                        <Button @click="declineInvite(partyId)">Decline</Button>
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
