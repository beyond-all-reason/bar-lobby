// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { db } from "@renderer/store/db";
import { reactive } from "vue";
import { SubsManager } from "@renderer/utils/subscriptions-manager";
import { UserReportRequestData } from "tachyon-protocol/types";
import { notificationsApi } from "@renderer/api/notifications";
import { tachyonRequest } from "@renderer/api/tachyon";

export const usersStore: {
    isInitialized: boolean;
} = reactive({
    isInitialized: false,
});

export const subsManager = new SubsManager();

export function initUsersStore() {
    if (usersStore.isInitialized) {
        console.warn("Users store is already initialized. Skipping initialization.");
        return;
    }

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

/**
 * Request reporting of one or more users to moderators for violation of rules.
 * @param data Required data for submission of this request to the server.
 */
async function requestReportUsers(data: UserReportRequestData) {
    try {
        const response = await tachyonRequest("user/report", data);
        console.log("Tachyon user/report:", response);

        return true;
    } catch (error) {
        console.error("Error with request user/report", error);
        notificationsApi.alert({ text: "Error with request user/report", severity: "error" });

        return false;
    }
}

export const users = {
    requestReportUsers,
};
