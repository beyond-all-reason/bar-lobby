// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { me } from "@renderer/store/me.store";
import {
    PartyInvitedEventData,
    PartyRemovedEventData,
    PartyUpdatedEventData,
    PartyId,
    PartyAcceptInviteRequestData,
    PartyCancelInviteRequestData,
    PartyDeclineInviteRequestData,
    PartyInviteRequestData,
    PartyKickMemberRequestData,
    UserId,
} from "tachyon-protocol/types";
import { reactive } from "vue";
import { notificationsApi } from "@renderer/api/notifications";
import { Party } from "@renderer/model/party";
import { subsManager } from "@renderer/store/users.store";

const partySymbol = Symbol("party.store");

export enum PlayersPartyState {
    None = "None",
    InvitedOnly = "InvitedOnly",
    JoinedOnly = "JoinedOnly",
    JoinedAndInvited = "JoinedAndInvited",
}

export const partyStore: {
    isInitialized: boolean;
    activeParty: Party | null;
    parties: Map<PartyId, Party>; //All parties (all invited, and up to one joined)
    state: PlayersPartyState;
} = reactive({
    isInitialized: false,
    activeParty: null,
    parties: new Map(),
    state: PlayersPartyState.None,
});

/**
 * Send a Tachyon request to accept a specific pending party invite.
 * @param data Required data payload for this request
 */
async function requestAcceptInvite(data: PartyAcceptInviteRequestData) {
    try {
        const response = await window.tachyon.request("party/acceptInvite", data);
        console.log("Tachyon: party/acceptInvite response:", response);
        // Nothing further required here; client should receive a party/updated event upon joining.
    } catch (error) {
        console.error("Tachyon error: party/acceptInvite:", error);
        notificationsApi.alert({ text: "Error with request party/acceptInvite", severity: "error" });
    }
}

/**
 * Send a Tachyon request to cancel a pending party invitation for a specific user
 * @param data Required data payload for this request
 */
async function requestCancelInvite(data: PartyCancelInviteRequestData) {
    try {
        const response = await window.tachyon.request("party/cancelInvite", data);
        console.log("Tachyon: party/cancelInvite:", response);
    } catch (error) {
        console.error("Tachyon error: party/cancelInvite:", error);
        notificationsApi.alert({ text: "Error with request party/cancelInvite", severity: "error" });
    }
}

/**
 * Send a Tachyon request to create a new party with only the requestee in it.
 */
async function requestCreate() {
    try {
        const response = await window.tachyon.request("party/create");
        console.log("Tachyon: party/create:", response);
        partyStore.parties.set(response.data.party.id, { ...response.data.party, seen: false });
        parsePartyData();
    } catch (error) {
        console.error("Tachyon error: party/create:", error);
        notificationsApi.alert({ text: "Error with request party/create", severity: "error" });
    }
}

/**
 * Send a Tachyon request to decline a specific pending party invite.
 * @param data Required data payload for this request
 */
async function requestDeclineInvite(data: PartyDeclineInviteRequestData) {
    try {
        const response = await window.tachyon.request("party/declineInvite", data);
        console.log("Tachyon: party/declineInvite:", response);
    } catch (error) {
        console.error("Tachyon error: party/declineInvite:", error);
        notificationsApi.alert({ text: "Error with request party/declineInvite", severity: "error" });
    }
}

/**
 * Send a Tachyon request to create a pending party invite for a specific user
 * @param data Required data payload for this request
 */
async function requestInvite(data: PartyInviteRequestData) {
    try {
        const response = await window.tachyon.request("party/invite", data);
        console.log("Tachyon: party/invite:", response);
        // Reminder; success is not "user joined party", but is instead "pending invite created".
    } catch (error) {
        console.error("Tachyon error: party/invite:", error);
        notificationsApi.alert({ text: "Error with request party/invite", severity: "error" });
    }
}

/**
 * Send a Tachyon request to remove a specific user from the current party
 * @param data Required data payload for this request
 */
async function requestKickMember(data: PartyKickMemberRequestData) {
    try {
        const response = await window.tachyon.request("party/kickMember", data);
        console.log("Tachyon: party/kickMember:", response);
    } catch (error) {
        console.error("Tachyon error: party/kickMember:", error);
        notificationsApi.alert({ text: "Error with request party/kickMember", severity: "error" });
    }
}

/**
 * Send a Tachyon request for the user to remove themselves from their active party
 */
async function requestLeave() {
    try {
        const response = await window.tachyon.request("party/leave");
        console.log("Tachyon: party/leave:", response);
        if (partyStore.activeParty) partyStore.parties.delete(partyStore.activeParty?.id);
        partyStore.activeParty = null;
        parsePartyData();
    } catch (error) {
        console.error("Tachyon error: party/leave:", error);
        notificationsApi.alert({ text: "Error with request party/leave", severity: "error" });
    }
}

function onInvitedEvent(data: PartyInvitedEventData) {
    console.log("Tachyon: party/invited:", data);
    partyStore.parties.set(data.party.id, { ...data.party, seen: false });
    parsePartyData();
}

function onRemovedEvent(data: PartyRemovedEventData) {
    console.log("Tachyon: party/removed:", data);
    // Note that "party/removed" includes cancelled or expired invitations in addition to being kicked/leaving.
    partyStore.parties.delete(data.partyId);
    parsePartyData();
    if (partyStore.activeParty?.id === data.partyId) {
        partyStore.activeParty = null;
    }
}

function onUpdatedEvent(data: PartyUpdatedEventData) {
    console.log("Tachyon: party/updated:", data);
    partyStore.parties.set(data.id, { ...data, seen: false });
    parsePartyData();
}

// We might be invited, or member, have to check to know.
function parsePartyData() {
    // Reset active party in case we are no longer in a party.
    partyStore.activeParty = null;
    const bools = {
        joined: false,
        invited: false,
    };
    const users: Array<UserId> = [];
    partyStore.parties.forEach((party) => {
        for (const member of party.members) {
            if (member.userId === me.userId) {
                bools.joined = true;
                partyStore.activeParty = party;
            } else users.push(member.userId);
        }
        for (const invitee of party.invited) {
            if (invitee.userId === me.userId) {
                bools.invited = true;
            } else users.push(invitee.userId);
        }
    });
    subsManager.setList(users, partySymbol);
    if (bools.joined) {
        if (bools.invited) {
            partyStore.state = PlayersPartyState.JoinedAndInvited;
        } else partyStore.state = PlayersPartyState.JoinedOnly;
    } else if (bools.invited) {
        partyStore.state = PlayersPartyState.InvitedOnly;
    } else partyStore.state = PlayersPartyState.None;
}

export async function initPartyStore() {
    if (partyStore.isInitialized) return;

    window.tachyon.onEvent("party/invited", onInvitedEvent);
    window.tachyon.onEvent("party/removed", onRemovedEvent);
    window.tachyon.onEvent("party/updated", onUpdatedEvent);

    partyStore.isInitialized = true;
}

export const party = { requestAcceptInvite, requestCancelInvite, requestCreate, requestDeclineInvite, requestInvite, requestKickMember, requestLeave };
