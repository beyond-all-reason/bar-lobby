// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { db } from "@renderer/store/db";
import { reactive } from "vue";
import { SubsManager } from "@renderer/utils/subscriptions-manager";

export const usersStore: {
    isInitialized: boolean;
} = reactive({
    isInitialized: false,
});

export const subsManager = new SubsManager();

export function initUsersStore() {
    if (usersStore.isInitialized) return;
    window.tachyon.onEvent("user/updated", (event) => {
        console.debug(`Received user/updated event: ${JSON.stringify(event)}`);
        event.users.forEach(async (user) => {
            if (!user.userId) {
                console.warn("Received user/updated event with no userId, skipping update.");
                return;
            }

            const updated = await db.users.update(user.userId, { ...user });

            if (updated === 0) {
                // No records updated, so user doesn't exist - create new user
                db.users.add({
                    userId: user.userId,
                    username: user.username ?? "Unknown User",
                    displayName: user.displayName ?? "Unknown User",
                    clanBaseData: user.clanBaseData ?? null,
                    partyId: null,
                    countryCode: user.countryCode ?? "??",
                    status: user.status ?? "offline",
                    roles: user.roles ?? [],
                    rating: user.rating ?? undefined,
                    battleRoomState: {},
                    isMe: 0,
                    ...user,
                });
            }
        });
    });

    usersStore.isInitialized = true;
}

export async function fetchUserInfo(userId: string) {
    try {
        const response = await window.tachyon.request("user/info", { userId: userId });
        return response.data;
    } catch (error) {
        console.error("Error fetching user info:", error);
        return null;
    }
}
