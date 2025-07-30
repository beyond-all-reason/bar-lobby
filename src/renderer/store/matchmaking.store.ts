// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import { MatchmakingListOkResponseData } from "tachyon-protocol/types";

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
    selectedQueue: string;
    playlists: MatchmakingListOkResponseData["playlists"];
    isLoadingQueues: boolean;
    queueError?: string;
}>({
    isInitialized: false,
    isDrawerOpen: false,
    status: MatchmakingStatus.Idle,
    selectedQueue: "1v1",
    playlists: [],
    isLoadingQueues: false,
    queueError: undefined,
});

export function initializeMatchmakingStore() {
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

    matchmakingStore.isInitialized = true;
}

export function fetchAvailableQueues() {
    matchmakingStore.isLoadingQueues = true;
    matchmakingStore.queueError = undefined;

    return window.tachyon
        .request("matchmaking/list")
        .then((response) => {
            if (response.status === "success" && response.data) {
                const data = response.data as MatchmakingListOkResponseData;
                matchmakingStore.playlists = data.playlists;

                // Set default selected queue if current selection is not available
                const hasSelectedQueue = data.playlists.some((playlist) => playlist.id === matchmakingStore.selectedQueue);
                if (data.playlists.length > 0 && !hasSelectedQueue) {
                    matchmakingStore.selectedQueue = data.playlists[0].id;
                }
            } else {
                console.error("Failed to fetch available queues", response);
                const failedResponse = response as any;
                matchmakingStore.queueError = failedResponse.reason || "Failed to fetch queues";
            }
        })
        .catch((error) => {
            console.error("Error fetching available queues:", error);
            matchmakingStore.queueError = "Network error";
        })
        .finally(() => {
            matchmakingStore.isLoadingQueues = false;
        });
}

export function getPlaylistName(id: string): string {
    const playlist = matchmakingStore.playlists.find((playlist) => playlist.id === id);
    return playlist?.name || id;
}

export const matchmaking = {
    async startSearch() {
        matchmakingStore.status = MatchmakingStatus.Searching;
        const response = await window.tachyon.request("matchmaking/queue", { queues: [matchmakingStore.selectedQueue] });
        if (response.status === "failed") {
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
