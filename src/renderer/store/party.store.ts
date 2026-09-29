// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { PartyId, PartyState, UserId } from "tachyon-protocol/types";
import { reactive, readonly } from "vue";
import { Party } from "@renderer/model/party";

export enum PlayersPartyState {
    None = "None",
    InvitedOnly = "InvitedOnly",
    JoinedOnly = "JoinedOnly",
    JoinedAndInvited = "JoinedAndInvited",
}

const state: {
    activeParty: PartyId | undefined;
    parties: Map<PartyId, Party>; //All parties (all invited, and up to one joined)
    state: PlayersPartyState;
} = reactive({
    activeParty: undefined,
    parties: new Map(),
    state: PlayersPartyState.None,
});

export const partyStore = readonly(state);

// We might be invited, or member, have to check to know.
function settle(myUserId: UserId) {
    // Reset active party in case we are no longer in a party.
    state.activeParty = undefined;
    let joined = false;
    let invited = false;
    for (const party of state.parties.values()) {
        if (party.members.some((member) => member.userId === myUserId)) {
            joined = true;
            state.activeParty = party.id;
        }
        if (party.invited.some((invitee) => invitee.userId === myUserId)) {
            invited = true;
        }
    }

    if (joined) {
        state.state = invited ? PlayersPartyState.JoinedAndInvited : PlayersPartyState.JoinedOnly;
    } else {
        state.state = invited ? PlayersPartyState.InvitedOnly : PlayersPartyState.None;
    }
}

export const partyUpdates = {
    set(party: PartyState, myUserId: UserId) {
        state.parties.set(party.id, { ...party, seen: false });
        settle(myUserId);
    },
    remove(partyId: PartyId, myUserId: UserId) {
        state.parties.delete(partyId);
        settle(myUserId);
    },
    replaceAll(parties: PartyState[], myUserId: UserId) {
        state.parties.clear();
        for (const party of parties) {
            state.parties.set(party.id, { ...party, seen: false });
        }
        settle(myUserId);
    },
    markSeen(partyId: PartyId) {
        const party = state.parties.get(partyId);
        if (party) {
            party.seen = true;
        }
    },
    clear() {
        state.activeParty = undefined;
        state.parties.clear();
        state.state = PlayersPartyState.None;
    },
};
