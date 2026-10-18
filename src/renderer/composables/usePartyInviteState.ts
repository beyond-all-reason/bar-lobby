// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { partyStore, PlayersPartyState } from "@renderer/store/party.store";
import { partyLogic } from "@renderer/logic/party";
import { alertRequestFailure } from "@renderer/utils/alert-request-failure";

export function usePartyInviteState(userId: MaybeRefOrGetter<string>) {
    const activeParty = computed(() => (partyStore.activeParty ? partyStore.parties.get(partyStore.activeParty) : undefined));

    const maxMembersReached = computed(() => {
        if (!activeParty.value) return false;
        return (activeParty.value.members?.length || 0) + (activeParty.value.invited?.length || 0) >= activeParty.value.maxMembers;
    });

    const userInParty = computed(() => activeParty.value?.members?.some((member) => member.userId === toValue(userId)) || false);

    const userInvited = computed(() => activeParty.value?.invited?.some((invited) => invited.userId === toValue(userId)) || false);

    async function inviteToParty() {
        try {
            if (partyStore.state === PlayersPartyState.JoinedOnly || partyStore.state === PlayersPartyState.JoinedAndInvited) {
                await partyLogic.invite({ userId: toValue(userId) });
            } else {
                await partyLogic.createAndInvite(toValue(userId));
            }
        } catch (error) {
            alertRequestFailure(error, "party/invite");
        }
    }

    return { maxMembersReached, userInParty, userInvited, inviteToParty };
}
