// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive } from "vue";
import {
    MatchmakingCancelledEventData,
    MatchmakingFoundEventData,
    MatchmakingFoundUpdateEventData,
    MatchmakingListOkResponseData,
    MatchmakingQueuesJoinedEventData,
    MatchmakingQueueUpdateEventData,
} from "tachyon-protocol/types";
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

function onQueueUpdateEvent(data: MatchmakingQueueUpdateEventData) {
    console.log("Tachyhon event: matchmaking/queueUpdate:", data);
}

function onLostEvent() {
    console.log("Tachyon event: matchmaking/lost: no data");
    matchmakingStore.status = MatchmakingStatus.Searching;
}

function onFoundUpdateEvent(data: MatchmakingFoundUpdateEventData) {
    console.log("Tachyon event: matchmaking/foundUpdate", data);
}

function onCancelledEvent(data: MatchmakingCancelledEventData) {
    console.log("Tachyon event: matchmaking/cancelled:", data);
    matchmakingStore.status = MatchmakingStatus.Idle;
}

function onFoundEvent(data: MatchmakingFoundEventData) {
    console.log("Tachyon event: matchmaking/found:", data);
    matchmakingStore.status = MatchmakingStatus.MatchFound;
    // Per spec, we have 10 seconds to send the ``matchmaking/ready`` request or we get cancelled from queue.
    // Probably better to track this timer on the UI side because the user will either need to 'ready' or 'cancel'
    // and they need to know this. Plus the UI has to "pop up" because they need to respond to it.
}

function onQueuesJoinedEvent(data: MatchmakingQueuesJoinedEventData) {
    console.log("Tachyon event: matchmaking/queuesJoined:", data);
    matchmakingStore.status = MatchmakingStatus.Searching;
}

export async function sendListRequest() {
    matchmakingStore.isLoadingQueues = true;
    matchmakingStore.queueError = undefined;
    try {
        const response = await window.tachyon.request("matchmaking/list");
        matchmakingStore.playlists = response.data.playlists;

        // Set default selected queue if current selection is not available
        const hasSelectedQueue = matchmakingStore.playlists.some((playlist) => playlist.id === matchmakingStore.selectedQueue);
        if (matchmakingStore.playlists.length > 0 && !hasSelectedQueue) {
            matchmakingStore.selectedQueue = matchmakingStore.playlists[0].id;
        }
    } catch (error) {
        console.error("Tachyon error: matchmaking/list:", error);
        matchmakingStore.queueError = "Failed to retrieve available queues";
    } finally {
        matchmakingStore.isLoadingQueues = false;
    }
}

export function getPlaylistName(id: string): string {
    const playlist = matchmakingStore.playlists.find((playlist) => playlist.id === id);
    return playlist?.name || id;
}

async function sendQueueRequest() {
    try {
        matchmakingStore.errorMessage = null;
        matchmakingStore.status = MatchmakingStatus.Searching;
        await window.tachyon.request("matchmaking/queue", { queues: [matchmakingStore.selectedQueue] });
    } catch (error) {
        console.error("Tachyon error: matchmaking/queue:", error);
        matchmakingStore.errorMessage = "Error with matchmaking/queue";
        matchmakingStore.status = MatchmakingStatus.Idle;
    }
}

async function sendCancelRequest() {
    matchmakingStore.status = MatchmakingStatus.Idle;
    try {
        const response = await window.tachyon.request("matchmaking/cancel");
        console.log("Tachyon: matchmaking/cancel:", response.status);
    } catch (error) {
        console.error("Tachyon: matchmaking/cancel:", error);
        matchmakingStore.errorMessage = "Error with matchmaking/cancel";
    }
}

async function sendReadyRequest() {
    matchmakingStore.status = MatchmakingStatus.MatchAccepted;
    try {
        const response = await window.tachyon.request("matchmaking/ready");
        console.log("Tachyon: matchmaking/ready:", response.status);
    } catch (error) {
        matchmakingStore.status = MatchmakingStatus.Idle;
        console.error("Tachyon error: matchmaking/ready:", error);
        matchmakingStore.errorMessage = "Error with matchmaking/ready";
    }
}

export async function initializeMatchmakingStore() {
    if (matchmakingStore.isInitialized) return;

    window.tachyon.onEvent("matchmaking/queueUpdate", (data) => {
        onQueueUpdateEvent(data);
    });

    window.tachyon.onEvent("matchmaking/lost", () => {
        onLostEvent();
    });

    window.tachyon.onEvent("matchmaking/foundUpdate", (data) => {
        onFoundUpdateEvent(data);
    });

    window.tachyon.onEvent("matchmaking/cancelled", (data) => {
        onCancelledEvent(data);
    });

    window.tachyon.onEvent("matchmaking/found", (data) => {
        onFoundEvent(data);
    });

    window.tachyon.onEvent("matchmaking/queuesJoined", (data) => {
        onQueuesJoinedEvent(data);
    });

    if (tachyonStore.isConnected) {
        await sendListRequest();
    }

    matchmakingStore.isInitialized = true;
}

export const matchmaking = { sendCancelRequest, sendQueueRequest, sendReadyRequest };
