// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import {
    PartyAcceptInviteRequestData,
    PartyCancelInviteRequestData,
    PartyDeclineInviteRequestData,
    PartyId,
    PartyInviteRequestData,
    PartyInvitedEventData,
    PartyKickMemberRequestData,
    PartyRemovedEventData,
    PartyState,
    PartyUpdatedEventData,
    UserId,
    UserSelfEventData,
} from "tachyon-protocol/types";
import { onTachyonEvent, tachyonRequest } from "@renderer/api/tachyon";
import { me } from "@renderer/store/me.store";
import { partyStore, partyUpdates } from "@renderer/store/party.store";
import { subsManager } from "@renderer/store/users.store";
import { onWentOffline } from "@renderer/utils/offline-signal";

const partySymbol = Symbol("party");

let isInitialized = false;

function watchPartyUsers(myUserId: UserId) {
    const users = [...partyStore.parties.values()]
        .flatMap((party) => [...party.members, ...party.invited])
        .map(({ userId }) => userId)
        .filter((userId) => userId !== myUserId);

    subsManager.setList(users, partySymbol);
}

function setParty(party: PartyState) {
    partyUpdates.set(party, me.userId);
    watchPartyUsers(me.userId);
}

function removeParty(partyId: PartyId) {
    partyUpdates.remove(partyId, me.userId);
    watchPartyUsers(me.userId);
}

function clearParty() {
    subsManager.clearAllFromList(partySymbol);
    partyUpdates.clear();
}

/**
 * Send a Tachyon request to accept a specific pending party invite.
 * Note that if the user is currently in a party, this will also remove them from that first party (on success).
 * @param data Required data payload for this request
 */
async function acceptInvite(data: PartyAcceptInviteRequestData) {
    const previousParty = partyStore.activeParty;
    const response = await tachyonRequest("party/acceptInvite", data);
    console.log("Tachyon: party/acceptInvite response:", response);
    // Client should receive a party/updated event upon joining, but if we were in a party before, we have to manually handle the removal of that one.
    // We don't do this before success, because we might not actually leave the other party on the serverside if the join fails!
    if (previousParty) {
        removeParty(previousParty);
    }
}

/**
 * Send a Tachyon request to cancel a pending party invitation for a specific user
 * @param data Required data payload for this request
 */
async function cancelInvite(data: PartyCancelInviteRequestData) {
    const response = await tachyonRequest("party/cancelInvite", data);
    console.log("Tachyon: party/cancelInvite:", response);
}

/**
 * Send a Tachyon request to create a new party with only the requestee in it.
 */
async function create() {
    const response = await tachyonRequest("party/create");
    console.log("Tachyon: party/create:", response);
    setParty(response.data.party);
}

/**
 * Send a Tachyon request to create a new party and then invite a specific user to it immediately afterward.
 * @param userId The user to request the invite for
 */
async function createAndInvite(userId: UserId) {
    await create();
    await invite({ userId });
}

/**
 * Send a Tachyon request to decline a specific pending party invite.
 * @param data Required data payload for this request
 */
async function declineInvite(data: PartyDeclineInviteRequestData) {
    const response = await tachyonRequest("party/declineInvite", data);
    console.log("Tachyon: party/declineInvite:", response);
    // Note; we do not get a party/updated event for the declined party, so we have to clear it ourselves.
    removeParty(data.partyId);
}

/**
 * Send a Tachyon request to create a pending party invite for a specific user
 * @param data Required data payload for this request
 */
async function invite(data: PartyInviteRequestData) {
    const response = await tachyonRequest("party/invite", data);
    console.log("Tachyon: party/invite:", response);
    // Reminder; success is not "user joined party", but is instead "pending invite created".
}

/**
 * Send a Tachyon request to remove a specific user from the current party
 * @param data Required data payload for this request
 */
async function kickMember(data: PartyKickMemberRequestData) {
    const response = await tachyonRequest("party/kickMember", data);
    console.log("Tachyon: party/kickMember:", response);
}

/**
 * Send a Tachyon request for the user to remove themselves from their active party
 */
async function leave() {
    const response = await tachyonRequest("party/leave");
    console.log("Tachyon: party/leave:", response);
    removeParty(partyStore.activeParty ?? "");
}

function markSeen(partyId: PartyId) {
    partyUpdates.markSeen(partyId);
}

function onLogout() {
    if (partyStore.activeParty) {
        // A polite notification to the server, so it isn't awaited and a failure only gets logged by tachyonRequest.
        leave().catch(() => {});
    }
    clearParty();
}

function onInvitedEvent(data: PartyInvitedEventData) {
    console.log("Tachyon: party/invited:", data);
    setParty(data.party);
}

function onRemovedEvent(data: PartyRemovedEventData) {
    console.log("Tachyon: party/removed:", data);
    // Note that "party/removed" includes cancelled or expired invitations in addition to being kicked/leaving.
    removeParty(data.partyId);
}

function onUpdatedEvent(data: PartyUpdatedEventData) {
    console.log("Tachyon: party/updated:", data);
    setParty(data);
}

// me.store only updates me.userId after an await, so this goes by the id in the event.
function onUserSelfEvent({ user }: UserSelfEventData) {
    partyUpdates.replaceAll([...(user.party ? [user.party] : []), ...(user.invitedToParties || [])], user.userId);
    watchPartyUsers(user.userId);
}

export function initPartyLogic() {
    if (isInitialized) {
        console.warn("Party logic is already initialized. Skipping initialization.");

        return;
    }

    onWentOffline.add(clearParty);
    onTachyonEvent("party/invited", onInvitedEvent);
    onTachyonEvent("party/removed", onRemovedEvent);
    onTachyonEvent("party/updated", onUpdatedEvent);
    onTachyonEvent("user/self", onUserSelfEvent);

    isInitialized = true;
}

export const partyLogic = {
    acceptInvite,
    cancelInvite,
    create,
    createAndInvite,
    declineInvite,
    invite,
    kickMember,
    leave,
    markSeen,
    onLogout,
};
