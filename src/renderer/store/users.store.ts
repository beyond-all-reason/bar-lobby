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
                    username: "Unknown User",
                    displayName: "Unknown User",
                    clanId: null,
                    partyId: null,
                    countryCode: "??",
                    status: "offline",
                    battleRoomState: {},
                    ...user, // Override defaults with actual data
                });
            }
        });
    });

    usersStore.isInitialized = true;
}
