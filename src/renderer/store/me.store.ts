// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Me } from "@main/model/user";
import { db } from "@renderer/store/db";
import { reactive, toRaw } from "vue";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { PrivateUser } from "tachyon-protocol/types";
import { subsManager } from "@renderer/store/users.store";

export const me = reactive<
    Me & {
        isInitialized: boolean;
        isAuthenticated: boolean;
    }
>({
    isInitialized: false,
    userId: "0",
    clanId: null,
    partyId: null,
    countryCode: "",
    displayName: "",
    status: "offline",
    isAuthenticated: false,
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

async function login() {
    try {
        await window.auth.login();
        me.isAuthenticated = true;
    } catch (e) {
        console.error(e);
        me.isAuthenticated = false;
        throw e;
    }
}

function playOffline() {
    me.isAuthenticated = false;
}

async function logout() {
    subsManager.clearAllFromList(friendsSymbol);
    window.auth.logout();
    window.tachyon.disconnect();
    me.isAuthenticated = false;
}

async function changeAccount() {
    await window.auth.wipe();
    me.isAuthenticated = false;
}

window.tachyon.onEvent("user/self", async (event) => {
    console.debug(`Received user/self event: ${JSON.stringify(event)}`);
    if (event && event.user) {
        await db.users.where({ isMe: 1 }).modify({ isMe: 0 });
        Object.assign(me, event.user);
        db.users.put({
            ...toRaw(me),
            isMe: 1,
        });

        await processFriendData(event.user);
    }
});

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

window.tachyon.onEvent("friend/requestReceived", async (event) => {
    me.incomingFriendRequestUserIds.add(event.from);
    await subscribeToUsers([event.from]);
});

window.tachyon.onEvent("friend/requestAccepted", async (event) => {
    me.outgoingFriendRequestUserIds.delete(event.from);
    me.friendUserIds.add(event.from);
});

window.tachyon.onEvent("friend/requestRejected", async (event) => {
    me.outgoingFriendRequestUserIds.delete(event.from);
    await unsubscribeFromUsers([event.from]);
});

window.tachyon.onEvent("friend/requestCancelled", async (event) => {
    me.incomingFriendRequestUserIds.delete(event.from);
    await unsubscribeFromUsers([event.from]);
});

window.tachyon.onEvent("friend/removed", async (event) => {
    me.friendUserIds.delete(event.from);
    await unsubscribeFromUsers([event.from]);
});

// export const me = readonly(_me);
export const auth = { login, playOffline, logout, changeAccount };

// Friend methods
export const friends = {
    async sendRequest(to: string) {
        const response = await window.tachyon.request("friend/sendRequest", { to });
        me.outgoingFriendRequestUserIds.add(to);
        await subscribeToUsers([to]);
        return response;
    },

    async acceptRequest(from: string) {
        try {
            const response = await window.tachyon.request("friend/acceptRequest", { from });
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
            const response = await window.tachyon.request("friend/rejectRequest", { from });
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
            const response = await window.tachyon.request("friend/cancelRequest", { to });
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
        const response = await window.tachyon.request("friend/remove", { userId });
        me.friendUserIds.delete(userId);
        await unsubscribeFromUsers([userId]);
        return response;
    },

    async fetchFriendList() {
        const response = await window.tachyon.request("friend/list");
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
    },
};

export async function initMeStore() {
    await db.users
        .where({ isMe: 1 })
        .first()
        .then((user) => {
            if (user) {
                Object.assign(me, user);
            }
        });
    const hasCredentials = await window.auth.hasCredentials();
    if (hasCredentials) {
        await login();

        if (tachyonStore.isConnected) {
            await friends.fetchFriendList();
        }
    }

    me.isInitialized = true;
}
