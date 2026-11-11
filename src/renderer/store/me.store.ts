// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Me } from "@main/model/user";
import { db } from "@renderer/store/db";
import { reactive, toRaw } from "vue";
import {
    PrivateUser,
    UserSelfEventData,
    FriendRequestReceivedEventData,
    FriendRequestAcceptedEventData,
    FriendRequestRejectedEventData,
    FriendRequestCancelledEventData,
    FriendRemovedEventData,
} from "tachyon-protocol/types";
import { subsManager } from "@renderer/store/users.store";
import { onWentOffline } from "@renderer/utils/offline-signal";
import { onTachyonConnected } from "@renderer/utils/connection-signal";
import { notificationsApi } from "@renderer/api/notifications";
import { isTachyonError, tachyonRequest } from "@renderer/api/tachyon";
import { battleHistoryActions } from "@renderer/store/battleHistory.store";
import { connectionStore } from "@renderer/store/connection.store";

export const me = reactive<
    Me & {
        isInitialized: boolean;
    }
>({
    isInitialized: false,
    userId: "0",
    clanId: null,
    partyId: null,
    countryCode: "",
    displayName: "",
    status: "offline",
    username: "Player",
    battleRoomState: {},
    outgoingFriendRequestUserIds: new Set<string>(),
    incomingFriendRequestUserIds: new Set<string>(),
    friendUserIds: new Set<string>(),
    ignoreUserIds: new Set<string>(),
    permissions: new Set<string>(),
});

const friendsSymbol = Symbol("me.store");

async function subscribeToUsers(userIds: string[]) {
    if (userIds.length === 0) return;
    subsManager.attach(userIds, friendsSymbol);
}

async function unsubscribeFromUsers(userIds: string[]) {
    if (userIds.length === 0) return;
    subsManager.detach(userIds, friendsSymbol);
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
        Object.assign(me, data.user);
        db.users.put({
            ...toRaw(me),
            isMe: 1,
        });

        await processFriendData(data.user);
    }
}

// Process friend data and manage subscriptions
async function processFriendData(userData: PrivateUser) {
    try {
        // Clear existing friend data and populate with new data
        me.friendUserIds = new Set(userData.friendIds);
        me.outgoingFriendRequestUserIds = new Set(userData.outgoingFriendRequest.map((r) => r.to));
        me.incomingFriendRequestUserIds = new Set(userData.incomingFriendRequest.map((r) => r.from));

        // Get all user IDs to subscribe to
        const allUserIds = Array.from(toRaw(me.friendUserIds).union(me.outgoingFriendRequestUserIds).union(me.incomingFriendRequestUserIds));

        if (allUserIds.length > 0) {
            await subscribeToUsers(allUserIds);
        }
    } catch (error) {
        console.error("Failed to process friend data:", error);
    }
}

async function onFriendRequestReceivedEvent(data: FriendRequestReceivedEventData) {
    me.incomingFriendRequestUserIds.add(data.from);
    await subscribeToUsers([data.from]);
}

async function onFriendRequestAcceptedEvent(data: FriendRequestAcceptedEventData) {
    me.outgoingFriendRequestUserIds.delete(data.from);
    me.friendUserIds.add(data.from);
}

async function onFriendRequestRejectedEvent(data: FriendRequestRejectedEventData) {
    me.outgoingFriendRequestUserIds.delete(data.from);
    await unsubscribeFromUsers([data.from]);
}

async function onFriendRequestCancelledEvent(data: FriendRequestCancelledEventData) {
    me.incomingFriendRequestUserIds.delete(data.from);
    await unsubscribeFromUsers([data.from]);
}

async function onFriendRemovedEvent(data: FriendRemovedEventData) {
    me.friendUserIds.delete(data.from);
    await unsubscribeFromUsers([data.from]);
}

// Identity fields survive; they're persisted in db and used while offline.
function clearOnlineState() {
    subsManager.clearAllFromList(friendsSymbol);
}

// Friend methods
export const friends = {
    async sendRequest(to: string) {
        const response = await tachyonRequest("friend/sendRequest", { to });
        me.outgoingFriendRequestUserIds.add(to);
        await subscribeToUsers([to]);
        return response;
    },

    async acceptRequest(from: string) {
        try {
            const response = await tachyonRequest("friend/acceptRequest", { from });
            me.incomingFriendRequestUserIds.delete(from);
            me.friendUserIds.add(from);
            return response;
        } catch (error) {
            // Remove from UI even on error since request is invalid
            me.incomingFriendRequestUserIds.delete(from);
            throw error;
        }
    },

    async rejectRequest(from: string) {
        try {
            const response = await tachyonRequest("friend/rejectRequest", { from });
            me.incomingFriendRequestUserIds.delete(from);
            await unsubscribeFromUsers([from]);
            return response;
        } catch (error) {
            // Remove from UI even on error since request is invalid
            me.incomingFriendRequestUserIds.delete(from);
            await unsubscribeFromUsers([from]);
            throw error;
        }
    },

    async cancelRequest(to: string) {
        try {
            const response = await tachyonRequest("friend/cancelRequest", { to });
            me.outgoingFriendRequestUserIds.delete(to);
            await unsubscribeFromUsers([to]);
            return response;
        } catch (error) {
            // Remove from UI even on error since request is invalid
            me.outgoingFriendRequestUserIds.delete(to);
            await unsubscribeFromUsers([to]);
            throw error;
        }
    },

    async remove(userId: string) {
        try {
            const response = await tachyonRequest("friend/remove", { userId });
            me.friendUserIds.delete(userId);
            await unsubscribeFromUsers([userId]);
            return response;
        } catch (error) {
            if (!isTachyonError(error)) {
                console.error(`Failed to remove friend with userId: ${userId}`, error);
            }

            notificationsApi.alert({ severity: "error", text: "Failed to remove friend." });
        }
    },

    async fetchFriendList() {
        try {
            const response = await tachyonRequest("friend/list");
            console.debug(`Received friend/list event: ${JSON.stringify(response)}`);

            // Clear existing friend data and populate with new data
            me.friendUserIds = new Set(response.data.friends.map((friend) => friend.userId));
            me.outgoingFriendRequestUserIds = new Set(response.data.outgoingPendingRequests.map((req) => req.to));
            me.incomingFriendRequestUserIds = new Set(response.data.incomingPendingRequests.map((req) => req.from));

            // Get all user IDs to subscribe to
            const allUserIds = Array.from(toRaw(me.friendUserIds).union(me.outgoingFriendRequestUserIds).union(me.incomingFriendRequestUserIds));

            if (allUserIds.length > 0) {
                await subscribeToUsers(allUserIds);
            }
            return response;
        } catch (error) {
            if (!isTachyonError(error)) {
                console.error(`Failed to fetch friend list`, error);
            }

            notificationsApi.alert({ severity: "error", text: "Failed to fetch friend list." });
        }
    },
};

export async function initMeStore() {
    if (me.isInitialized) {
        console.warn("Me store is already initialized. Skipping initialization.");
        return;
    }
    onWentOffline.add(clearOnlineState);
    onTachyonConnected.add(() => {
        // Subscriptions don't survive the socket, so rebuild them from the server's friend list
        // rather than trusting what subsManager held before the drop.
        if (connectionStore.isAuthenticated) {
            friends.fetchFriendList();
        }
    });
    // We need to register these listeners before we try to restore a previous session
    window.tachyon.onEvent("user/self", onUserSelfEvent);
    window.tachyon.onEvent("friend/requestReceived", onFriendRequestReceivedEvent);
    window.tachyon.onEvent("friend/requestAccepted", onFriendRequestAcceptedEvent);
    window.tachyon.onEvent("friend/requestRejected", onFriendRequestRejectedEvent);
    window.tachyon.onEvent("friend/requestCancelled", onFriendRequestCancelledEvent);
    window.tachyon.onEvent("friend/removed", onFriendRemovedEvent);
    window.tachyon.onEvent("battle/ended", battleHistoryActions.recordBattleEnded);

    // Last known, from whenever we were last connected. Absent on a fresh
    // install, in which case the defaults stand in until a socket says otherwise.
    const identity = await window.auth.getIdentity();
    if (identity) {
        Object.assign(me, identity);
    }

    me.isInitialized = true;
}
