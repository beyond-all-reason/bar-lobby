// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Me } from "@main/model/user";
import { db } from "@renderer/store/db";
import { reactive, toRaw } from "vue";
import { tachyon } from "@renderer/store/tachyon.store";
import { PrivateUser } from "tachyon-protocol/types";
import { settingsStore } from "@renderer/store/settings.store";
import { subsManager } from "@renderer/store/users.store";
import { onWentOffline } from "@renderer/utils/offline-signal";

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

// The main process owns the session. Nothing here assigns isAuthenticated
// directly, or the UI can end up claiming a session that no longer exists.
async function syncAuthState() {
    const { authenticated } = await window.auth.getState();
    me.isAuthenticated = authenticated;
}

async function login(interactive = true) {
    try {
        await window.auth.login(interactive);
    } finally {
        // The change event and this reply are separate channels, so read the
        // state back rather than racing them.
        await syncAuthState();
    }
}

// Signing in and opening the socket are separate steps, and starting offline
// leaves the first one undone, so going online has to cover both.
async function goOnline() {
    if (!me.isAuthenticated) {
        await login(false);
    }

    await window.tachyon.connect();
}

async function logout() {
    await tachyon.goOffline();
    await window.auth.logout();
    await syncAuthState();
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

// Identity fields survive; they're persisted in db and used while offline.
function clearOnlineState() {
    subsManager.clearAllFromList(friendsSymbol);
}

// export const me = readonly(_me);
export const auth = { login, goOnline, logout, clearOnlineState };

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
    window.auth.onChanged(({ authenticated }) => {
        me.isAuthenticated = authenticated;
    });

    onWentOffline.add(clearOnlineState);
    window.tachyon.onConnected(() => {
        // Subscriptions don't survive the socket, so rebuild them from the server's friend list
        // rather than trusting what subsManager held before the drop.
        if (me.isAuthenticated) {
            friends.fetchFriendList();
        }
    });

    await db.users
        .where({ isMe: 1 })
        .first()
        .then((user) => {
            if (user) {
                Object.assign(me, user);
            }
        });

    await syncAuthState();
    await restorePreviousSession();

    me.isInitialized = true;
}

// Multiplayer is behind devMode, so outside it there is no session to restore.
async function restorePreviousSession() {
    if (!settingsStore.devMode) return;
    if (!settingsStore.loginAutomatically) return;
    if (!(await window.auth.hasCredentials())) return;

    try {
        // Non-interactive, because a rejected refresh token must not open a
        // browser window while the user is still looking at the loading screen.
        await goOnline();
    } catch (error) {
        // This runs before the UI mounts, so there is nowhere to show a retry.
        // Signing out matters when the token was fine and the socket was refused
        // anyway, say for a ban or a version the server no longer speaks: without
        // it the UI claims a session and nothing retries, because a connection
        // that never opened never fires a disconnect.
        console.warn("Could not restore the previous session, continuing offline", error);
        await logout();

        return;
    }

    try {
        await friends.fetchFriendList();
    } catch (error) {
        console.warn("Could not fetch the friend list", error);
    }
}
