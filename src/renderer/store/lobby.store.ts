// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import type { Mod, MemberSyncStatus } from "tachyon-protocol/types";
import { me } from "@renderer/store/me.store";

// Infer LobbyDetails from the response type
type LobbyDetails = Awaited<ReturnType<typeof window.tachyon.request<"lobby/join">>>["data"];

// TypeScript interface for type safety
interface LobbyState {
    currentLobby: LobbyDetails | null;
    isJoined: boolean;
    isBoss: boolean;
    error: string | null;
    isLoading: boolean;
    isUpdatingMods: boolean;
}

export const lobbyStore = reactive<LobbyState>({
    currentLobby: null,
    isJoined: false,
    isBoss: false,
    error: null,
    isLoading: false,
    isUpdatingMods: false,
});

// Store event cleanup functions to prevent memory leaks
let eventCleanupFunctions: Array<() => void> = [];

export function initLobbyStore() {
    // Listen to lobby/updated events
    const cleanupLobbyUpdated = window.tachyon.onEvent("lobby/updated", (data) => {
        if (lobbyStore.currentLobby && data.id === lobbyStore.currentLobby.id) {
            // Apply JSON Merge Patch - server sends only changed fields
            Object.assign(lobbyStore.currentLobby, data);

            // Update boss status if it changed
            if (data.bossId) {
                lobbyStore.isBoss = data.bossId === me.userId;
            }
        }
    });

    // Store cleanup function if available
    if (typeof cleanupLobbyUpdated === "function") {
        eventCleanupFunctions.push(cleanupLobbyUpdated);
    }
}

export function cleanupLobbyStore() {
    eventCleanupFunctions.forEach((cleanup) => cleanup());
    eventCleanupFunctions = [];

    // Reset state
    lobbyStore.currentLobby = null;
    lobbyStore.isJoined = false;
    lobbyStore.isBoss = false;
    lobbyStore.error = null;
    lobbyStore.isLoading = false;
    lobbyStore.isUpdatingMods = false;
}

export const lobbyActions = {
    async joinLobby(lobbyId: string) {
        lobbyStore.isLoading = true;
        lobbyStore.error = null;

        try {
            const response = await window.tachyon.request("lobby/join", { id: lobbyId });
            lobbyStore.currentLobby = response.data;
            lobbyStore.isJoined = true;
            lobbyStore.isBoss = response.data.bossId === me.userId;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            lobbyStore.error = `Failed to join lobby: ${message}`;
            console.error("Failed to join lobby:", error);
            throw error;
        } finally {
            lobbyStore.isLoading = false;
        }
    },

    async leaveLobby() {
        if (!lobbyStore.currentLobby) return;

        lobbyStore.isLoading = true;
        lobbyStore.error = null;

        try {
            await window.tachyon.request("lobby/leave");
            lobbyStore.currentLobby = null;
            lobbyStore.isJoined = false;
            lobbyStore.isBoss = false;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            lobbyStore.error = `Failed to leave lobby: ${message}`;
            console.error("Failed to leave lobby:", error);
            throw error;
        } finally {
            lobbyStore.isLoading = false;
        }
    },

    async updateMods(mods: Mod[]) {
        if (!lobbyStore.isBoss) {
            throw new Error("Only lobby boss can update mods");
        }
        if (!lobbyStore.currentLobby) return;

        lobbyStore.isUpdatingMods = true;
        lobbyStore.error = null;

        try {
            await window.tachyon.request("lobby/updateMods", {
                lobbyId: lobbyStore.currentLobby.id,
                mods,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            lobbyStore.error = `Failed to update mods: ${message}`;
            console.error("Failed to update mods:", error);
            throw error;
        } finally {
            lobbyStore.isUpdatingMods = false;
        }
    },

    async updateSync(sync: MemberSyncStatus) {
        if (!lobbyStore.currentLobby) return;

        try {
            await window.tachyon.request("lobby/updateSync", {
                lobbyId: lobbyStore.currentLobby.id,
                sync,
            });
        } catch (error) {
            // Silent fail for sync updates - they're not critical and happen frequently
            console.warn("Failed to update sync status:", error);
        }
    },
};
