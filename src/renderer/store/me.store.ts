// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Me } from "@main/model/user";
import { db } from "@renderer/store/db";
import { reactive, toRaw } from "vue";

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
    outgoingFriendRequestUserIds: new Set<number>(),
    incomingFriendRequestUserIds: new Set<number>(),
    friendUserIds: new Set<number>(),
    ignoreUserIds: new Set<number>(),
    permissions: new Set<string>(),
});

const subscribedUserIds = new Set<string>();

async function subscribeToUsers(userIds: string[]) {
    if (userIds.length === 0) return;

    try {
        const userIdsTuple = userIds as [string, ...string[]];
        await window.tachyon.request("user/subscribeUpdates", { userIds: userIdsTuple });
        userIds.forEach((id) => subscribedUserIds.add(id));
    } catch (error) {
        console.error("Failed to subscribe to users:", error);
    }
}

async function unsubscribeFromUsers(userIds: string[]) {
    if (userIds.length === 0) return;

    try {
        const userIdsTuple = userIds as [string, ...string[]];
        await window.tachyon.request("user/unsubscribeUpdates", { userIds: userIdsTuple });
        userIds.forEach((id) => subscribedUserIds.delete(id));
    } catch (error) {
        console.error("Failed to unsubscribe from users:", error);
    }
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
    if (subscribedUserIds.size > 0) {
        await unsubscribeFromUsers(Array.from(subscribedUserIds));
    }

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
    }
});

// Handle friend list updates and manage subscriptions
export async function fetchFriendList() {
    try {
        const response = await window.tachyon.request("friend/list");
        if (response.status === "success" && response.data) {
            // Clear existing friend data
            me.friendUserIds.clear();
            me.outgoingFriendRequestUserIds.clear();
            me.incomingFriendRequestUserIds.clear();

            // Populate friend data
            if (response.data.friends) {
                response.data.friends.forEach((friend) => {
                    me.friendUserIds.add(parseInt(friend.userId));
                });
            }
            if (response.data.outgoingPendingRequests) {
                response.data.outgoingPendingRequests.forEach((req) => {
                    me.outgoingFriendRequestUserIds.add(parseInt(req.to));
                });
            }
            if (response.data.incomingPendingRequests) {
                response.data.incomingPendingRequests.forEach((req) => {
                    me.incomingFriendRequestUserIds.add(parseInt(req.from));
                });
            }

            // Get all user IDs to subscribe to
            const allUserIds = [
                ...(response.data.friends || []).map((friend) => friend.userId),
                ...(response.data.outgoingPendingRequests || []).map((req) => req.to),
                ...(response.data.incomingPendingRequests || []).map((req) => req.from),
            ];

            if (allUserIds.length > 0) {
                await subscribeToUsers(allUserIds);
            }
        }
    } catch (error) {
        console.error("Failed to fetch friend list:", error);
    }
}

window.tachyon.onEvent("friend/requestReceived", async (event) => {
    if (event?.from) {
        me.incomingFriendRequestUserIds.add(parseInt(event.from));
        await subscribeToUsers([event.from]);
    }
});

window.tachyon.onEvent("friend/requestAccepted", async (event) => {
    if (event?.from) {
        me.outgoingFriendRequestUserIds.delete(parseInt(event.from));
        me.friendUserIds.add(parseInt(event.from));
    }
});

window.tachyon.onEvent("friend/requestRejected", async (event) => {
    if (event?.from) {
        me.outgoingFriendRequestUserIds.delete(parseInt(event.from));
        await unsubscribeFromUsers([event.from]);
    }
});

window.tachyon.onEvent("friend/requestCancelled", async (event) => {
    if (event?.from) {
        me.incomingFriendRequestUserIds.delete(parseInt(event.from));
        await unsubscribeFromUsers([event.from]);
    }
});

window.tachyon.onEvent("friend/removed", async (event) => {
    if (event?.from) {
        me.friendUserIds.delete(parseInt(event.from));
        await unsubscribeFromUsers([event.from]);
    }
});

// export const me = readonly(_me);
export const auth = { login, playOffline, logout, changeAccount };

// Friend methods
export const friends = {
    async sendRequest(to: string) {
        const response = await window.tachyon.request("friend/sendRequest", { to });
        if (response.status === "success") {
            me.outgoingFriendRequestUserIds.add(parseInt(to));
            await subscribeToUsers([to]);
        }
        return response;
    },

    async acceptRequest(from: string) {
        const response = await window.tachyon.request("friend/acceptRequest", { from });
        if (response.status === "success") {
            me.incomingFriendRequestUserIds.delete(parseInt(from));
            me.friendUserIds.add(parseInt(from));
        }
        return response;
    },

    async rejectRequest(from: string) {
        const response = await window.tachyon.request("friend/rejectRequest", { from });
        if (response.status === "success") {
            me.incomingFriendRequestUserIds.delete(parseInt(from));
            await unsubscribeFromUsers([from]);
        }
        return response;
    },

    async cancelRequest(to: string) {
        const response = await window.tachyon.request("friend/cancelRequest", { to });
        if (response.status === "success") {
            me.outgoingFriendRequestUserIds.delete(parseInt(to));
            await unsubscribeFromUsers([to]);
        }
        return response;
    },

    async remove(userId: string) {
        const response = await window.tachyon.request("friend/remove", { userId });
        if (response.status === "success") {
            me.friendUserIds.delete(parseInt(userId));
            await unsubscribeFromUsers([userId]);
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
    }
    me.isInitialized = true;
}
