// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import { MatchmakingListOkResponseData, MatchmakingListOkResponse } from "tachyon-protocol/types";
import { tachyonStore } from "@renderer/store/tachyon.store";

export enum MatchmakingStatus {
    Idle = "Idle",
    Searching = "Searching",
    MatchFound = "MatchFound",
    MatchAccepted = "MatchAccepted",
}

export const matchmakingStore = reactive<{
    isInitialized: boolean;
    isDrawerOpen: boolean;
    status: MatchmakingStatus;
    errorMessage: string | null;
    selectedQueue: string;
    playlists: MatchmakingListOkResponseData["playlists"];
    isLoadingQueues: boolean;
    queueError?: string;
}>({
    isInitialized: false,
    isDrawerOpen: false,
    status: MatchmakingStatus.Idle,
    errorMessage: null,
    selectedQueue: "1v1",
    playlists: [],
    isLoadingQueues: false,
    queueError: undefined,
});

export async function initializeMatchmakingStore() {
    if (matchmakingStore.isInitialized) return;

    window.tachyon.onEvent("matchmaking/queueUpdate", (event) => {
        console.debug(`matchmaking/queueUpdate: ${JSON.stringify(event)}`);
    });

    window.tachyon.onEvent("matchmaking/lost", (event) => {
        console.debug(`matchmaking/lost: ${JSON.stringify(event)}`);
        matchmakingStore.status = MatchmakingStatus.Searching;
    });

    window.tachyon.onEvent("matchmaking/foundUpdate", (event) => {
        console.debug(`matchmaking/foundUpdate: ${JSON.stringify(event)}`);
    });

    window.tachyon.onEvent("matchmaking/cancelled", (event) => {
        console.debug(`matchmaking/cancelled: ${JSON.stringify(event)}`);
        matchmakingStore.status = MatchmakingStatus.Idle;
    });

    window.tachyon.onEvent("matchmaking/found", (event) => {
        console.debug(`matchmaking/found: ${JSON.stringify(event)}`);
        matchmakingStore.status = MatchmakingStatus.MatchFound;
    });

    if (tachyonStore.isConnected) {
        await fetchAvailableQueues();
    }

    matchmakingStore.isInitialized = true;
}

export async function fetchAvailableQueues() {
    matchmakingStore.isLoadingQueues = true;
    matchmakingStore.queueError = undefined;
    try {
        const response = (await window.tachyon.request("matchmaking/list")) as MatchmakingListOkResponse;
        matchmakingStore.playlists = response.data.playlists;

        // Set default selected queue if current selection is not available
        const hasSelectedQueue = matchmakingStore.playlists.some((playlist) => playlist.id === matchmakingStore.selectedQueue);
        if (matchmakingStore.playlists.length > 0 && !hasSelectedQueue) {
            matchmakingStore.selectedQueue = matchmakingStore.playlists[0].id;
        }
    } catch (error) {
        console.error("Failed to fetch available queues", error);
        matchmakingStore.queueError = "Failed to fetch queues";
    } finally {
        matchmakingStore.isLoadingQueues = false;
    }
}

export function getPlaylistName(id: string): string {
    const playlist = matchmakingStore.playlists.find((playlist) => playlist.id === id);
    return playlist?.name || id;
}

export const matchmaking = {
    async startSearch() {
        try {
            matchmakingStore.errorMessage = null;
            matchmakingStore.status = MatchmakingStatus.Searching;
            await window.tachyon.request("matchmaking/queue", { queues: [matchmakingStore.selectedQueue] });
        } catch (error) {
            console.error("Error starting matchmaking:", error);
            matchmakingStore.errorMessage = "Error: Failed to join the matchmaking queue.";
            matchmakingStore.status = MatchmakingStatus.Idle;
        }
    },
    stopSearch() {
        matchmakingStore.status = MatchmakingStatus.Idle;
        window.tachyon.request("matchmaking/cancel");
    },
    async acceptMatch() {
        matchmakingStore.status = MatchmakingStatus.MatchAccepted;
        const response = await window.tachyon.request("matchmaking/ready");
        if (response.status === "failed") {
            matchmakingStore.status = MatchmakingStatus.Idle;
        }
    },
};
