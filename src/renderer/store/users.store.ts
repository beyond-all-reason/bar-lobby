// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { db } from "@renderer/store/db";
import { reactive } from "vue";

export const usersStore = reactive<{
    isInitialized: boolean;
}>({
    isInitialized: false,
});

export async function getUserByID(id: string) {
    return db.users.get(id);
}

export function initUsersStore() {
    if (usersStore.isInitialized) return;

    window.tachyon.onEvent("user/updated", (event) => {
        console.debug(`Received user/updated event: ${JSON.stringify(event)}`);
        event.users.forEach((user) => {
            if (!user.userId) {
                console.warn("Received user/updated event with no userId, skipping update.");
                return;
            }
            db.users.update(user.userId, {
                ...user,
            });
        });
    });

    usersStore.isInitialized = true;
}
