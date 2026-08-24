// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { db } from "@renderer/store/db";
import { reactive } from "vue";
import { SubsManager } from "@renderer/utils/subscriptions-manager";
import { UserReportRequestData } from "tachyon-protocol/types";
import { notificationsApi } from "@renderer/api/notifications";
import { onUserStoppedPlayingSignal } from "@renderer/utils/user-self-signal";

export const usersStore: {
    isInitialized: boolean;
} = reactive({
    isInitialized: false,
});

export const subsManager = new SubsManager();

export function initUsersStore() {
    if (usersStore.isInitialized) return;

    // Fires for both update() and put() (Dexie diffs put() against the existing row),
    // so this also covers the full-row replace done for the "user/self" event.
    // FIX: This only works if the client itself didn't crash and end back up in "menu" when logging in.
    // Because they never go back to "playing" after rejoin. The correct fix is for the server to
    // implement the battle/ended event (which is hooked up in the client already).
    // Remove this after server implementation is complete.
    db.users.hook("updating", (modifications, _primKey, oldObj) => {
        if (oldObj.isMe !== 1 || oldObj.status !== "playing") return;
        if (!("status" in modifications) || modifications.status === "playing") return;

        onUserStoppedPlayingSignal.dispatch();
    });

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
        const response = await window.tachyon.request("user/report", data);
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
