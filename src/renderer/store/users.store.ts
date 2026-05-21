// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { db } from "@renderer/store/db";
import { reactive } from "vue";
import { SubsManager } from "@renderer/utils/subscriptions-manager";
import { UserId, UserReportRequestData } from "tachyon-protocol/types";
import { notificationsApi } from "@renderer/api/notifications";

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
 * @param userIds Array of UserIds that are the subject of this report
 * @param reason String for the type of report, typically 'action' (actions in game) or 'chat' (words in chat)
 * @param message String for any additional context or information for this report.
 */
async function requestReportUsers(userIds: UserId[], reason: string, message: string) {
    try {
        const data: UserReportRequestData = {
            userIds: userIds,
            reason: { type: reason },
            message: message,
        };
        const response = await window.tachyon.request("user/report", data);
        console.log("Tachyon user/report:", response);
    } catch (error) {
        console.error("Error with request user/report", error);
        notificationsApi.alert({ text: "Error with request user/report", severity: "error" });
    }
}

export const users = {
    requestReportUsers,
};
