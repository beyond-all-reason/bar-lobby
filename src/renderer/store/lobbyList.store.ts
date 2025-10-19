// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import type { LobbyOverview } from "tachyon-protocol/types";

// TypeScript interface for type safety
interface LobbyListState {
    lobbies: LobbyOverview[];
    isSubscribed: boolean;
    isLoading: boolean;
    error: string | null;
}

export const lobbyListStore = reactive<LobbyListState>({
    lobbies: [],
    isSubscribed: false,
    isLoading: false,
    error: null,
});

// Store event cleanup functions to prevent memory leaks
let eventCleanupFunctions: Array<() => void> = [];

export function initLobbyListStore() {
    // Listen to lobby list events
    const cleanupListReset = window.tachyon.onEvent("lobby/listReset", (data) => {
        console.log("Received lobby list reset:", data);

        // Convert object to array if needed
        let lobbiesArray: LobbyOverview[] = [];
        if (data.lobbies) {
            if (Array.isArray(data.lobbies)) {
                lobbiesArray = data.lobbies.filter((lobby): lobby is LobbyOverview => lobby !== null && lobby !== undefined);
            } else {
                // Convert object to array and filter out null values
                lobbiesArray = Object.values(data.lobbies).filter((lobby): lobby is LobbyOverview => lobby !== null && lobby !== undefined);
            }
        }

        lobbyListStore.lobbies = lobbiesArray;
        lobbyListStore.isLoading = false;
        lobbyListStore.error = null;
    });

    const cleanupListUpdated = window.tachyon.onEvent("lobby/listUpdated", (data) => {
        console.log("Received lobby list update:", data);

        // Handle the case where data.lobbies is an object (like the server sends)
        if (data.lobbies && typeof data.lobbies === "object" && !Array.isArray(data.lobbies)) {
            // Convert object to array and filter out null values
            const lobbiesArray = Object.values(data.lobbies).filter((lobby): lobby is LobbyOverview => lobby !== null && lobby !== undefined);
            console.log("Converting lobbies object to array:", lobbiesArray);
            lobbyListStore.lobbies = lobbiesArray;
            return;
        }

        // The LobbyListUpdatedEventData only contains lobbies object, no legacy event handling needed
    });

    // Store cleanup functions if available
    if (typeof cleanupListReset === "function") {
        eventCleanupFunctions.push(cleanupListReset);
    }
    if (typeof cleanupListUpdated === "function") {
        eventCleanupFunctions.push(cleanupListUpdated);
    }
}

export function cleanupLobbyListStore() {
    eventCleanupFunctions.forEach((cleanup) => cleanup());
    eventCleanupFunctions = [];

    // Reset state
    lobbyListStore.lobbies = [];
    lobbyListStore.isSubscribed = false;
    lobbyListStore.isLoading = false;
    lobbyListStore.error = null;
}

export const lobbyListActions = {
    async subscribeToList() {
        if (lobbyListStore.isSubscribed) return;

        lobbyListStore.isLoading = true;
        lobbyListStore.error = null;

        try {
            await window.tachyon.request("lobby/subscribeList");
            lobbyListStore.isSubscribed = true;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            lobbyListStore.error = `Failed to subscribe to lobby list: ${message}`;
            console.error("Failed to subscribe to lobby list:", error);
            throw error;
        } finally {
            lobbyListStore.isLoading = false;
        }
    },

    async unsubscribeFromList() {
        if (!lobbyListStore.isSubscribed) return;

        try {
            await window.tachyon.request("lobby/unsubscribeList");
            lobbyListStore.isSubscribed = false;
            lobbyListStore.lobbies = [];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            lobbyListStore.error = `Failed to unsubscribe from lobby list: ${message}`;
            console.error("Failed to unsubscribe from lobby list:", error);
            throw error;
        }
    },
};
