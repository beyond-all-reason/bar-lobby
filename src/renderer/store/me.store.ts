// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Me } from "@main/model/user";
import { db } from "@renderer/store/db";
import { reactive, toRaw } from "vue";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { PrivateUser, UserId } from "tachyon-protocol/types";
import { notificationsApi } from "@renderer/api/notifications";

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
    lobbyUserIds: new Set<string>(),
    partyUserIds: new Set<string>(),
    matchmakingUserIds: new Set<string>(),
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

export enum SubLists {
    OUTGOINGFRIEND,
    INCOMINGFRIEND,
    FRIEND,
    LOBBY,
    PARTY,
    MATCH,
}

const meSets = [me.outgoingFriendRequestUserIds, me.incomingFriendRequestUserIds, me.friendUserIds, me.lobbyUserIds, me.partyUserIds, me.matchmakingUserIds];

/**
 * Attach the UserId(s) to the selected subscription list. A subscription request will be automatically sent to the Tachyon server if required.
 * @param users UserId, or Array of UserId, that will be attached
 * @param list SubLists Enum indicating which subscription list to attach them to.
 */
function attach(users: UserId, list: SubLists): void;
function attach(users: UserId[], list: SubLists): void;
function attach(users: UserId | UserId[], list: SubLists): void {
    const fullList = getAllUsersSubscribed();
    const newSubs: UserId[] = [];
    if (typeof users === "string") {
        if (!fullList.includes(users)) {
            newSubs.push(users);
        }
        meSets[list].add(users);
    } else {
        for (const user in users) {
            if (!fullList.includes(user)) {
                newSubs.push(user);
            }
            meSets[list].add(user);
        }
    }
    if (newSubs.length > 0) {
        try {
            const response = window.tachyon.request("user/subscribeUpdates", { userIds: newSubs });
            console.log("Tachyon user/subscribeUpdates request", response);
        } catch (error) {
            console.error("Tachyon error:", error);
            notificationsApi.alert({ text: "Tachyon error: user/subscribeUpdates request", severity: "error" });
        }
    }
}

/**
 * Detach the UserId(s) from the selected subscription list. An unsubscribe request will be automatically sent to the Tachyon Server if required.
 * @param users UserId, or Array of UserId, that will be detached
 * @param list SubLists Enum indicating which subscription list to detach them from
 */
function detach(users: UserId, list: SubLists): void;
function detach(users: UserId[], list: SubLists): void;
function detach(users: UserId | UserId[], list: SubLists): void {
    const oldSubs: UserId[] = [];
    if (typeof users === "string") {
        meSets[list].delete(users);
        if (getSubListsFromUsers(users).length == 0) {
            oldSubs.push(users);
        }
    } else {
        for (const user in users) {
            meSets[list].delete(user);
            if (getSubListsFromUsers(user).length == 0) {
                oldSubs.push(user);
            }
        }
    }
    if (oldSubs.length > 0) {
        try {
            const response = window.tachyon.request("user/unsubscribeUpdates", { userIds: oldSubs });
            console.log("Tachyon user/unsubscribeUpdates request", response);
        } catch (error) {
            console.error("Tachyon error:", error);
            notificationsApi.alert({ text: "Tachyon error: user/unsubscribeUpdates request", severity: "error" });
        }
    }
}

/**
 * Provides all UserId(s) currently part of the subscription list.
 * @param list Enum indicating which subscription list to get the UserIds for.
 * @returns An Array of UserId, or an empty Array if the list has none.
 */
function getUsersInSubList(list: SubLists): UserId[] {
    return Array.from(toRaw(meSets[list]));
}

/**
 * Provides all Sublists the identified UserId(s) are currently attached to.
 * @param users UserId, or Array of UserId
 * @returns An Array of ints, or an empty Array if the UserId(s) are in none of the lists.
 */
function getSubListsFromUsers(users: UserId): SubLists[];
function getSubListsFromUsers(users: UserId[]): SubLists[];
function getSubListsFromUsers(users: UserId | UserId[]): SubLists[] {
    const arr: SubLists[] = [];
    if (typeof users === "string") {
        for (let i = 0; i < meSets.length; i++) {
            if (meSets[i].has(users)) arr.push(i);
        }
    } else {
        for (const user in users) {
            for (let i = 0; i < meSets.length; i++) {
                if (meSets[i].has(user)) arr.push(i);
            }
        }
    }
    return arr;
}

function getAllUsersSubscribed() {
    return Array.from(toRaw(me.friendUserIds).union(me.outgoingFriendRequestUserIds).union(me.incomingFriendRequestUserIds).union(me.lobbyUserIds).union(me.partyUserIds).union(me.matchmakingUserIds));
}

export const subscriptions = { attach, detach, getUsersInSubList, getSubListsFromUsers, getAllUsersSubscribed };
