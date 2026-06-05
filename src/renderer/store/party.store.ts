// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// import { me } from "@renderer/store/me.store";
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
    PartyState,
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
    JoinedOnly = "Joined",
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
        // TODO: Response includes the new party ID, but do also get party/updated event also? Event is preferrable
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
        //TODO: Do we get a party/removed event or do we handle it here upon success?
    } catch (error) {
        console.error("Tachyon error: party/leave:", error);
        notificationsApi.alert({ text: "Error with request party/leave", severity: "error" });
    }
}

function onInvitedEvent(data: PartyInvitedEventData) {
    console.log("Tachyon: party/invited:", data);
    partyStore.parties.set(data.party.id, data.party);
    // We don't know if we were the invitee or the member getting updates?
    parsePartyData(data.party);
}

function onRemovedEvent(data: PartyRemovedEventData) {
    console.log("Tachyon: party/removed:", data);
    // Note that "party/removed" includes cancelled or expired invitations also
    partyStore.parties.delete(data.partyId);
    if (partyStore.activeParty?.id == data.partyId) {
        partyStore.activeParty = null;
    }
}

function onUpdatedEvent(data: PartyUpdatedEventData) {
    console.log("Tachyon: party/updated:", data);
    // Because "party/updated" includes invitees, we have to check if we are a member or just an invitee
    partyStore.parties.set(data.id, data);
    parsePartyData(data);
}

function parsePartyData(data: PartyState) {
    // TODO: Need to find out if we are going to remove party/invited to prefer party/updated only.
    // This is where we will find out if we are a member, or invitee
    // So we will need to set the partyStore.state appropriately here.
    const users: Array<UserId> = [];
    for (const members of data.members) {
        users.push(members.userId);
    }
    for (const invitees of data.invited) {
        users.push(invitees.userId);
    }
    //TODO: I suspect we will need to keep a set of party-related UserIds so we can know when to detach also.
    subsManager.attach(users, partySymbol);
}

export async function initPartyStore() {
    if (partyStore.isInitialized) return;

    window.tachyon.onEvent("party/invited", onInvitedEvent);
    window.tachyon.onEvent("party/removed", onRemovedEvent);
    window.tachyon.onEvent("party/updated", onUpdatedEvent);

    partyStore.isInitialized = true;
}

export const party = { requestAcceptInvite, requestCancelInvite, requestCreate, requestDeclineInvite, requestInvite, requestKickMember, requestLeave };
