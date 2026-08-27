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
    PrivateUser,
} from "tachyon-protocol/types";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { notificationsApi } from "@renderer/api/notifications";
import { isTachyonErrorForCommand, tachyonRequest } from "@renderer/api/tachyon";
import { onWentOffline } from "@renderer/utils/offline-signal";
import { onUserSelfMatchmakingSignal } from "@renderer/utils/user-self-signal";
import { router } from "@renderer/router";

// The server is the authority on the real ready-up deadline and will send its own
// matchmaking/cancelled event if we miss it; this margin just narrows the window
// where our local countdown and the server's deadline can disagree.
const READY_TIMEOUT_SAFETY_MARGIN_MS = 100;

export enum MatchmakingStatus {
    Idle = "Idle",
    JoinRequested = "JoinRequested",
    Searching = "Searching",
    MatchFound = "MatchFound",
    MatchAccepted = "MatchAccepted",
}

export const matchmakingStore: {
    isInitialized: boolean;
    isDrawerOpen: boolean;
    status: MatchmakingStatus;
    errorMessage: string | null;
    selectedQueue: string;
    playlists: MatchmakingListOkResponseData["playlists"];
    isLoadingQueues: boolean;
    queueError?: string;
    playersReady?: number;
    playersQueued?: number;
    // Each playlist is keyed by its id, and any array elements in the value object are required downloads for the corresponding type
    downloadsRequired: {
        [k: string]: {
            engines: string[];
            games: string[];
            maps: string[];
        };
    };
    queueTimeout?: number;
    readyCountdownInterval?: number;
    readySecondsRemaining?: number;
} = reactive({
    isInitialized: false,
    isDrawerOpen: false,
    status: MatchmakingStatus.Idle,
    errorMessage: null,
    selectedQueue: "1v1",
    playlists: [],
    isLoadingQueues: false,
    queueError: undefined,
    playersReady: 0,
    playersQueued: 0,
    downloadsRequired: {},
    queueTimeout: undefined,
    readyCountdownInterval: undefined,
    readySecondsRemaining: undefined,
});

function clearReadyTimers() {
    if (matchmakingStore.queueTimeout !== undefined) {
        window.clearTimeout(matchmakingStore.queueTimeout);
        matchmakingStore.queueTimeout = undefined;
    }
    if (matchmakingStore.readyCountdownInterval !== undefined) {
        window.clearInterval(matchmakingStore.readyCountdownInterval);
        matchmakingStore.readyCountdownInterval = undefined;
    }
    matchmakingStore.readySecondsRemaining = undefined;
}

function onQueueUpdateEvent(data: MatchmakingQueueUpdateEventData) {
    console.log("Tachyon event: matchmaking/queueUpdate:", data);
    matchmakingStore.playersQueued = data.playersQueued;
}

function onLostEvent() {
    console.log("Tachyon event: matchmaking/lost: no data");
    clearReadyTimers();
    matchmakingStore.status = MatchmakingStatus.Searching;
}

function onFoundUpdateEvent(data: MatchmakingFoundUpdateEventData) {
    console.log("Tachyon event: matchmaking/foundUpdate", data);
    matchmakingStore.playersReady = data.readyCount;
}

function onCancelledEvent(data: MatchmakingCancelledEventData) {
    console.log("Tachyon event: matchmaking/cancelled:", data);
    clearReadyTimers();
    matchmakingStore.status = MatchmakingStatus.Idle;
    if (data.reason === "version_changed") {
        sendListRequest();
    }
}

function onFoundEvent(data: MatchmakingFoundEventData) {
    console.log("Tachyon event: matchmaking/found:", data);
    clearReadyTimers();
    matchmakingStore.status = MatchmakingStatus.MatchFound;
    // Deadline is our local prediction of the server's timeout, not the source of truth for it.
    const deadline = Date.now() + data.timeoutMs - READY_TIMEOUT_SAFETY_MARGIN_MS;
    matchmakingStore.readySecondsRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    matchmakingStore.readyCountdownInterval = window.setInterval(() => {
        matchmakingStore.readySecondsRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    }, 1000);
    matchmakingStore.queueTimeout = window.setTimeout(() => {
        clearReadyTimers();
        matchmakingStore.status = MatchmakingStatus.Idle;
    }, deadline - Date.now());
}

function onSelfUpdateFoundSignal(data: Extract<PrivateUser["matchmaking"], { state: "found" }>) {
    console.log("User/self update: matchmaking/found state:", data);
    clearReadyTimers();
    if (data.queue.hasAlreadyReadied) {
        matchmakingStore.status = MatchmakingStatus.MatchAccepted;
    } else {
        matchmakingStore.status = MatchmakingStatus.MatchFound;
        const deadline = data.queue.timeoutAt / 1000 - READY_TIMEOUT_SAFETY_MARGIN_MS; // Convert Unix timestamp from microseconds to milliseconds
        matchmakingStore.readySecondsRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        matchmakingStore.readyCountdownInterval = window.setInterval(() => {
            matchmakingStore.readySecondsRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        }, 1000);
        matchmakingStore.queueTimeout = window.setTimeout(() => {
            clearReadyTimers();
            matchmakingStore.status = MatchmakingStatus.Idle;
        }, deadline - Date.now());
    }
    router.push("/play/matchmaking");
}

function onQueuesJoinedEvent(data: MatchmakingQueuesJoinedEventData) {
    console.log("Tachyon event: matchmaking/queuesJoined:", data);
    // Current design is a single queue joined at a time. If the user has a *different* queue selected when their party joins, we switch so they match their party's selection.
    matchmakingStore.selectedQueue = data.queues[0];
    notificationsApi.alert({ text: "Successfully joined matchmaking queue(s)", severity: "info" });
    matchmakingStore.status = MatchmakingStatus.Searching;
}

/**
 * Sends a Tachyon 'matchmaking/list' request to get the latest matchmaking queues
 */
async function sendListRequest() {
    matchmakingStore.isLoadingQueues = true;
    matchmakingStore.queueError = undefined;
    try {
        const response = await window.tachyon.request("matchmaking/list");
        console.log("Tachyon: matchmaking/list:", response.data);
        matchmakingStore.playlists = response.data.playlists;

        // Set default selected queue if current selection is not available
        const hasSelectedQueue = matchmakingStore.playlists.some((playlist) => playlist.id === matchmakingStore.selectedQueue);
        if (matchmakingStore.playlists.length > 0 && !hasSelectedQueue) {
            matchmakingStore.selectedQueue = matchmakingStore.playlists[0].id;
        }
        await triggerAssetsRefresh();
    } catch (error) {
        console.error("Tachyon error: matchmaking/list:", error);
        notificationsApi.alert({ text: "Tachyon error: matchmaking/list", severity: "error" });
        matchmakingStore.queueError = "Failed to retrieve available queues";
    } finally {
        matchmakingStore.isLoadingQueues = false;
    }
}

/**
 * Refreshes the downloadsRequired arrays upon demand, if we expect that things have changed.
 */
async function triggerAssetsRefresh() {
    for (const queue of matchmakingStore.playlists) {
        await setRequiredAssetsArrays(queue.id, queue.engines, queue.games, queue.maps);
    }
}

async function setRequiredAssetsArrays(queue: string, engines: { version: string }[], games: { springName: string }[], maps: { springName: string }[]): Promise<void> {
    const missing = await window.content.missing([
        ...engines.map((engine) => ({ type: "engine" as const, id: engine.version })),
        ...games.map((game) => ({ type: "game" as const, id: game.springName })),
        ...maps.map((map) => ({ type: "map" as const, id: map.springName })),
    ]);

    matchmakingStore.downloadsRequired[queue] = {
        engines: missing.filter((ref) => ref.type === "engine").map((ref) => ref.id),
        games: missing.filter((ref) => ref.type === "game").map((ref) => ref.id),
        maps: missing.filter((ref) => ref.type === "map").map((ref) => ref.id),
    };
}

/**
 * Get the display name for a specific queue/playlist
 * @param id The ID for the requested queue/playlist
 * @returns The display name for the requested queue/playlist
 */
export function getPlaylistName(id: string): string {
    const playlist = matchmakingStore.playlists.find((playlist) => playlist.id === id);
    return playlist?.name || id;
}

/**
 * Sends a Tachyon 'matchmaking/queue' request, specifically using the matchmakingStore.selectedQueue
 */
async function sendQueueRequest() {
    if (matchmakingStore.downloadsRequired[matchmakingStore.selectedQueue] == undefined) {
        notificationsApi.alert({ text: "Bad queue data; refreshing list.", severity: "error" });
        await sendListRequest();
        return;
    }
    if (
        matchmakingStore.downloadsRequired[matchmakingStore.selectedQueue].maps.length > 0 ||
        matchmakingStore.downloadsRequired[matchmakingStore.selectedQueue].engines.length > 0 ||
        matchmakingStore.downloadsRequired[matchmakingStore.selectedQueue].games.length > 0
    ) {
        notificationsApi.alert({ text: "You have downloads required to join this queue.", severity: "info" });
        return;
    }
    matchmakingStore.status = MatchmakingStatus.JoinRequested; // Initial state, likely short-lived.
    try {
        matchmakingStore.errorMessage = null;
        const playlist = matchmakingStore.playlists.find((p) => p.id === matchmakingStore.selectedQueue);
        if (!playlist) {
            notificationsApi.alert({ text: "Selected queue not found. Refreshing list.", severity: "error" });
            await sendListRequest();
            matchmakingStore.status = MatchmakingStatus.Idle;
            return;
        }
        const response = await tachyonRequest("matchmaking/queue", {
            queues: [{ id: playlist.id, version: playlist.version }],
        });
        console.log("Tachyon: matchmaking/queue:", response.status);
        matchmakingStore.status = MatchmakingStatus.Searching;
    } catch (error) {
        if (isTachyonErrorForCommand(error, "matchmaking/queue")) {
            if (error.reason === "version_mismatch") {
                notificationsApi.alert({ text: "Queue version changed; refreshing list.", severity: "info" });
                await sendListRequest();
            } else if (error.reason === "party_missing_asset") {
                notificationsApi.alert({ text: "Party queue rejected, required assets are missing for the queue.", severity: "error" });
            } else {
                notificationsApi.alert({ text: `Queue request rejected for reason: ${error.reason}.`, severity: "error" });
                console.error("Tachyon error: matchmaking/queue:", error);
            }
        } else {
            console.error("Tachyon error: matchmaking/queue:", error);
            notificationsApi.alert({ text: "Tachyon error: matchmaking/queue", severity: "error" });
            matchmakingStore.errorMessage = "Error with matchmaking/queue";
        }
        matchmakingStore.status = MatchmakingStatus.Idle;
    }
}

/**
 * Sends a Tachyon 'matchmaking/cancel' request.
 */
async function sendCancelRequest() {
    clearReadyTimers();
    matchmakingStore.status = MatchmakingStatus.Idle;
    try {
        const response = await window.tachyon.request("matchmaking/cancel");
        console.log("Tachyon: matchmaking/cancel:", response.status);
    } catch (error) {
        console.error("Tachyon: matchmaking/cancel:", error);
        notificationsApi.alert({ text: "Tachyon error: matchmaking/cancel", severity: "error" });
        matchmakingStore.errorMessage = "Error with matchmaking/cancel";
    }
}

/**
 * Sends a Tachyon 'matchmaking/ready' request.
 */
async function sendReadyRequest() {
    clearReadyTimers();
    matchmakingStore.status = MatchmakingStatus.MatchAccepted;
    try {
        const response = await window.tachyon.request("matchmaking/ready");
        console.log("Tachyon: matchmaking/ready:", response.status);
    } catch (error) {
        matchmakingStore.status = MatchmakingStatus.Idle;
        console.error("Tachyon error: matchmaking/ready:", error);
        notificationsApi.alert({ text: "Tachyon error: matchmaking/ready", severity: "error" });
        matchmakingStore.errorMessage = "Error with matchmaking/ready";
    }
}

export async function initializeMatchmakingStore() {
    if (matchmakingStore.isInitialized) return;

    onWentOffline.add(clearOnlineState);
    window.tachyon.onEvent("matchmaking/queueUpdate", onQueueUpdateEvent);

    window.tachyon.onEvent("matchmaking/lost", onLostEvent);

    window.tachyon.onEvent("matchmaking/foundUpdate", onFoundUpdateEvent);

    window.tachyon.onEvent("matchmaking/cancelled", onCancelledEvent);

    window.tachyon.onEvent("matchmaking/found", onFoundEvent);

    window.tachyon.onEvent("matchmaking/queuesJoined", onQueuesJoinedEvent);

    if (tachyonStore.isConnected) {
        await sendListRequest();
    }
    onUserSelfMatchmakingSignal.add((data) => {
        switch (data.state) {
            case "no_matchmaking":
                clearReadyTimers();
                matchmakingStore.status = MatchmakingStatus.Idle;
                break;
            case "queuing":
                matchmakingStore.status = MatchmakingStatus.Searching;
                // We use the first queue provided because we do not currently support multi-queuing.
                matchmakingStore.selectedQueue = data.queues[0].id;
                break;
            case "found":
                onSelfUpdateFoundSignal(data);
                break;
        }
    });

    matchmakingStore.isInitialized = true;
}

// selectedQueue is the user's pick, not server state, and downloadsRequired is derived from
// installed content rather than the session - the next list response recomputes it.
export function clearOnlineState() {
    clearReadyTimers();
    matchmakingStore.status = MatchmakingStatus.Idle;
    matchmakingStore.playlists = [];
    matchmakingStore.isLoadingQueues = false;
    matchmakingStore.errorMessage = null;
    matchmakingStore.queueError = undefined;
    matchmakingStore.playersQueued = 0;
    matchmakingStore.playersReady = 0;
}

export const matchmaking = { sendCancelRequest, sendQueueRequest, sendReadyRequest, sendListRequest, triggerAssetsRefresh, clearOnlineState };
