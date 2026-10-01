// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type { PartyInviteRequestData } from "tachyon-protocol/types";
import { partyStore, party, PlayersPartyState } from "@renderer/store/party.store";

export function usePartyInviteState(userId: MaybeRefOrGetter<string>) {
    const activeParty = computed(() => (partyStore.activeParty ? partyStore.parties.get(partyStore.activeParty) : undefined));

    const maxMembersReached = computed(() => {
        if (!activeParty.value) return false;
        return (activeParty.value.members?.length || 0) + (activeParty.value.invited?.length || 0) >= activeParty.value.maxMembers;
    });

    const userInParty = computed(() => activeParty.value?.members?.some((member) => member.userId === toValue(userId)) || false);

    const userInvited = computed(() => activeParty.value?.invited?.some((invited) => invited.userId === toValue(userId)) || false);

    function inviteToParty() {
        if (partyStore.state === PlayersPartyState.JoinedOnly || partyStore.state === PlayersPartyState.JoinedAndInvited) {
            const data: PartyInviteRequestData = { userId: toValue(userId) };
            party.requestInvite(data);
        } else {
            party.requestCreateAndInvite(toValue(userId));
        }
    }

    return { maxMembersReached, userInParty, userInvited, inviteToParty };
}
