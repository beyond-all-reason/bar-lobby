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
import { useDexieLiveQueryWithDeps } from "@renderer/composables/useDexieLiveQuery";

export enum MatchmakingStatus {
    Idle = "Idle",
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
    // Each playlist will have it's own boolean, as the 'needed' property of an object keyed to the playlist's names
    downloadsRequired: {
        [k: string]: {
            needed: boolean;
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
        // Find out of we have the necessary maps for each queue we've been given.
        matchmakingStore.playlists.forEach((queue) => {
            if (queue.maps.length > 0) {
                matchmakingStore.downloadsRequired[queue.id] = { needed: checkIfAnyMapsAreNeeded(queue.maps) };
            } else {
                matchmakingStore.downloadsRequired[queue.id] = { needed: true };
            }
        });
    } catch (error) {
        console.error("Tachyon error: matchmaking/list:", error);
        matchmakingStore.queueError = "Failed to retrieve available queues";
    } finally {
        matchmakingStore.isLoadingQueues = false;
    }
}

// This is just to get is a quick idea if any maps will be needed to be downloaded
function checkIfAnyMapsAreNeeded(maps: { springName: string }[]): boolean {
    for (const item of maps) {
        const need = useDexieLiveQueryWithDeps([() => item.springName], () =>
            db.maps.get(item.springName).then((map) => {
                if (!map?.isInstalled) {
                    return true;
                }
            })
        );
        if (need) return true;
    }
    return false;
}

export function getPlaylistName(id: string): string {
    const playlist = matchmakingStore.playlists.find((playlist) => playlist.id === id);
    return playlist?.name || id;
}

async function sendQueueRequest() {
    try {
        matchmakingStore.errorMessage = null;
        matchmakingStore.status = MatchmakingStatus.Searching;
        //TODO: Before we can actually queue up, we have to ensure all needed maps are downloaded.
        //We will need a modal of maps required, each with an indicator if they're already stored, or a button to trigger download.
        //A "download all" button is also a nice idea, maybe with a "concurrent downloads" number in the UI.
        //Each will need an individual progress bar too.
        const response = await window.tachyon.request("matchmaking/queue", { queues: [matchmakingStore.selectedQueue] });
        console.log("Tachyon: matchmaking/queue:", response.status);
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

export const matchmaking = { sendCancelRequest, sendQueueRequest, sendReadyRequest, sendListRequest };
