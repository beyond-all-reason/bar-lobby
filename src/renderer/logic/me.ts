// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { toRaw } from "vue";
import {
    FriendRemovedEventData,
    FriendRequestAcceptedEventData,
    FriendRequestCancelledEventData,
    FriendRequestReceivedEventData,
    FriendRequestRejectedEventData,
    PrivateUser,
    UserSelfEventData,
} from "tachyon-protocol/types";
import { authApi } from "@renderer/api/auth";
import { isTachyonError, onTachyonEvent, tachyonRequest } from "@renderer/api/tachyon";
import { ui } from "@renderer/logic/ui";
import { battleHistoryActions } from "@renderer/store/battleHistory.store";
import { connectionStore } from "@renderer/store/connection.store";
import { db } from "@renderer/store/db";
import { me, meActions } from "@renderer/store/me.store";
import { subsManager } from "@renderer/store/users.store";
import { onTachyonConnected } from "@renderer/utils/connection-signal";
import { onWentOffline } from "@renderer/utils/offline-signal";

const friendsSymbol = Symbol("friends");

let isInitialized = false;

async function subscribeToUsers(userIds: string[]) {
    if (userIds.length === 0) return;
    subsManager.attach(userIds, friendsSymbol);
}

async function unsubscribeFromUsers(userIds: string[]) {
    if (userIds.length === 0) return;
    subsManager.detach(userIds, friendsSymbol);
}

function friendAndRequestUserIds() {
    return Array.from(toRaw(me.friendUserIds).union(me.outgoingFriendRequestUserIds).union(me.incomingFriendRequestUserIds));
}

// Main persists the identity off this same event and that is what gets read back
// on startup, but db.users is still where anything looking up a user by id goes,
// the profile view included, so our own record has to be in there too.
// TODO tidy this up: the row is a snapshot of the whole reactive object, written
// in two steps that aren't in one transaction, and nothing reads isMe any more.
async function onUserSelfEvent(data: UserSelfEventData) {
    console.debug(`Received user/self event: ${JSON.stringify(data)}`);
    if (data && data.user) {
        await db.users.where({ isMe: 1 }).modify({ isMe: 0 });
        meActions.assign(data.user);
        db.users.put({
            ...toRaw(me),
            isMe: 1,
        });

        await processFriendData(data.user);
    }
}

async function processFriendData(userData: PrivateUser) {
    try {
        meActions.setFriends(
            userData.friendIds,
            userData.outgoingFriendRequest.map((r) => r.to),
            userData.incomingFriendRequest.map((r) => r.from)
        );

        const allUserIds = friendAndRequestUserIds();

        if (allUserIds.length > 0) {
            await subscribeToUsers(allUserIds);
        }
    } catch (error) {
        console.error("Failed to process friend data:", error);
    }
}

async function onFriendRequestReceivedEvent(data: FriendRequestReceivedEventData) {
    meActions.addIncomingRequest(data.from);
    await subscribeToUsers([data.from]);
}

async function onFriendRequestAcceptedEvent(data: FriendRequestAcceptedEventData) {
    meActions.removeOutgoingRequest(data.from);
    meActions.addFriend(data.from);
}

async function onFriendRequestRejectedEvent(data: FriendRequestRejectedEventData) {
    meActions.removeOutgoingRequest(data.from);
    await unsubscribeFromUsers([data.from]);
}

async function onFriendRequestCancelledEvent(data: FriendRequestCancelledEventData) {
    meActions.removeIncomingRequest(data.from);
    await unsubscribeFromUsers([data.from]);
}

async function onFriendRemovedEvent(data: FriendRemovedEventData) {
    meActions.removeFriend(data.from);
    await unsubscribeFromUsers([data.from]);
}

// Identity fields survive; they're persisted in db and used while offline.
function clearOnlineState() {
    subsManager.clearAllFromList(friendsSymbol);
}

async function sendRequest(to: string) {
    const response = await tachyonRequest("friend/sendRequest", { to });
    meActions.addOutgoingRequest(to);
    await subscribeToUsers([to]);

    return response;
}

async function acceptRequest(from: string) {
    try {
        const response = await tachyonRequest("friend/acceptRequest", { from });
        meActions.removeIncomingRequest(from);
        meActions.addFriend(from);

        return response;
    } catch (error) {
        // Remove from UI even on error since request is invalid
        meActions.removeIncomingRequest(from);
        throw error;
    }
}

async function rejectRequest(from: string) {
    try {
        const response = await tachyonRequest("friend/rejectRequest", { from });
        meActions.removeIncomingRequest(from);
        await unsubscribeFromUsers([from]);

        return response;
    } catch (error) {
        // Remove from UI even on error since request is invalid
        meActions.removeIncomingRequest(from);
        await unsubscribeFromUsers([from]);
        throw error;
    }
}

async function cancelRequest(to: string) {
    try {
        const response = await tachyonRequest("friend/cancelRequest", { to });
        meActions.removeOutgoingRequest(to);
        await unsubscribeFromUsers([to]);

        return response;
    } catch (error) {
        // Remove from UI even on error since request is invalid
        meActions.removeOutgoingRequest(to);
        await unsubscribeFromUsers([to]);
        throw error;
    }
}

async function remove(userId: string) {
    const response = await tachyonRequest("friend/remove", { userId });
    meActions.removeFriend(userId);
    await unsubscribeFromUsers([userId]);

    return response;
}

async function fetchFriendList() {
    try {
        const response = await tachyonRequest("friend/list");
        console.debug(`Received friend/list event: ${JSON.stringify(response)}`);

        meActions.setFriends(
            response.data.friends.map((friend) => friend.userId),
            response.data.outgoingPendingRequests.map((req) => req.to),
            response.data.incomingPendingRequests.map((req) => req.from)
        );

        const allUserIds = friendAndRequestUserIds();

        if (allUserIds.length > 0) {
            await subscribeToUsers(allUserIds);
        }

        return response;
    } catch (error) {
        if (!isTachyonError(error)) {
            console.error(`Failed to fetch friend list`, error);
        }

        ui.friendListFailed();
    }
}

export async function initMeLogic() {
    if (isInitialized) {
        console.warn("Me logic is already initialized. Skipping initialization.");

        return;
    }

    onWentOffline.add(clearOnlineState);
    onTachyonConnected.add(() => {
        // Subscriptions don't survive the socket, so rebuild them from the server's friend list
        // rather than trusting what subsManager held before the drop.
        if (connectionStore.isAuthenticated) {
            fetchFriendList();
        }
    });
    // We need to register these listeners before we try to restore a previous session
    onTachyonEvent("user/self", onUserSelfEvent);
    onTachyonEvent("friend/requestReceived", onFriendRequestReceivedEvent);
    onTachyonEvent("friend/requestAccepted", onFriendRequestAcceptedEvent);
    onTachyonEvent("friend/requestRejected", onFriendRequestRejectedEvent);
    onTachyonEvent("friend/requestCancelled", onFriendRequestCancelledEvent);
    onTachyonEvent("friend/removed", onFriendRemovedEvent);
    onTachyonEvent("battle/ended", battleHistoryActions.recordBattleEnded);

    // Last known, from whenever we were last connected. Absent on a fresh
    // install, in which case the defaults stand in until a socket says otherwise.
    const identity = await authApi.getIdentity();
    if (identity) {
        meActions.assign(identity);
    }

    isInitialized = true;
}

export const friendsLogic = {
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    remove,
    fetchFriendList,
};
