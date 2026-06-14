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
import { db } from "@renderer/store/db";
import { notificationsApi } from "@renderer/api/notifications";
import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";

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
});

function onQueueUpdateEvent(data: MatchmakingQueueUpdateEventData) {
    console.log("Tachyon event: matchmaking/queueUpdate:", data);
    matchmakingStore.playersQueued = data.playersQueued;
}

function onLostEvent() {
    console.log("Tachyon event: matchmaking/lost: no data");
    matchmakingStore.status = MatchmakingStatus.Searching;
}

function onFoundUpdateEvent(data: MatchmakingFoundUpdateEventData) {
    console.log("Tachyon event: matchmaking/foundUpdate", data);
    matchmakingStore.playersReady = data.readyCount;
}

function onCancelledEvent(data: MatchmakingCancelledEventData) {
    console.log("Tachyon event: matchmaking/cancelled:", data);
    matchmakingStore.status = MatchmakingStatus.Idle;
    if (data.reason === "version_changed") {
        sendListRequest();
    }
}

function onFoundEvent(data: MatchmakingFoundEventData) {
    console.log("Tachyon event: matchmaking/found:", data);
    matchmakingStore.status = MatchmakingStatus.MatchFound;
    // Per spec, we have 10 seconds to send the ``matchmaking/ready`` request or we get cancelled from queue.
    // Probably better to track this timer on the UI side because the user will either need to 'ready' or 'cancel'
    // and they need to know this. Plus the UI has to "pop up" because they need to respond to it.
    // But we don't want to be "triggering" the UI from the store. Instead, we should add a watcher,
    // and when this value updates to MatchFound we can start our timer. Probably want a progress bar "counting down" too.
}

function onQueuesJoinedEvent(data: MatchmakingQueuesJoinedEventData) {
    console.log("Tachyon event: matchmaking/queuesJoined:", data);
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
    matchmakingStore.downloadsRequired[queue] = { engines: [], games: [], maps: [] };
    const queueMaps = maps.map((m) => m.springName);
    const dbMaps = await db.maps.bulkGet(queueMaps);
    for (const map of dbMaps) {
        if (map != undefined && !map.isInstalled) {
            matchmakingStore.downloadsRequired[queue].maps.push(map.springName);
        }
    }
    const queueEngines = new Set(engines.map((e) => e.version));
    const installedEngines = new Set(enginesStore.availableEngineVersions.filter((e) => e.installed).map((e) => e.id));
    const diffEngines = queueEngines.difference(installedEngines);
    matchmakingStore.downloadsRequired[queue].engines.push(...diffEngines);
    const queueGames = new Set(games.map((g) => g.springName));
    const installedGames = new Set(gameStore.availableGameVersions.keys());
    const diffGames = queueGames.difference(installedGames);
    matchmakingStore.downloadsRequired[queue].games.push(...diffGames);
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
        const response = await window.tachyon.request("matchmaking/queue", {
            queues: [{ id: playlist.id, version: playlist.version }],
        });
        console.log("Tachyon: matchmaking/queue:", response.status);
        matchmakingStore.status = MatchmakingStatus.Searching;
    } catch (error) {
        if (error instanceof Error && error.message.includes("version_mismatch")) {
            notificationsApi.alert({ text: "Queue version changed; refreshing list.", severity: "info" });
            await sendListRequest();
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

    window.tachyon.onEvent("matchmaking/queueUpdate", onQueueUpdateEvent);

    window.tachyon.onEvent("matchmaking/lost", onLostEvent);

    window.tachyon.onEvent("matchmaking/foundUpdate", onFoundUpdateEvent);

    window.tachyon.onEvent("matchmaking/cancelled", onCancelledEvent);

    window.tachyon.onEvent("matchmaking/found", onFoundEvent);

    window.tachyon.onEvent("matchmaking/queuesJoined", onQueuesJoinedEvent);

    if (tachyonStore.isConnected) {
        await sendListRequest();
    }

    matchmakingStore.isInitialized = true;
}

export const matchmaking = { sendCancelRequest, sendQueueRequest, sendReadyRequest, sendListRequest, triggerAssetsRefresh };
