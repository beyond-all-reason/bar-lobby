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
import { isTachyonErrorForCommand, tachyonRequest } from "@renderer/api/tachyon";
import { setupI18n } from "@renderer/i18n";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { db } from "@renderer/store/db";
import { notificationsApi } from "@renderer/api/notifications";

const i18n = setupI18n();

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
    selectedQueue: { id: string; version: string } | null;
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
    selectedQueue: null,
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

        // Keep selected queue in sync with latest playlist versions
        const selectedPlaylist = matchmakingStore.selectedQueue ? matchmakingStore.playlists.find((playlist) => playlist.id === matchmakingStore.selectedQueue?.id) : undefined;
        if (selectedPlaylist) {
            matchmakingStore.selectedQueue = { id: selectedPlaylist.id, version: selectedPlaylist.version };
        } else if (matchmakingStore.playlists.length > 0) {
            matchmakingStore.selectedQueue = {
                id: matchmakingStore.playlists[0].id,
                version: matchmakingStore.playlists[0].version,
            };
        } else {
            matchmakingStore.selectedQueue = null;
        }
        // Clear the "downloadsRequired" list because we have all-new playlist response
        matchmakingStore.downloadsRequired = {};
        // Find out of we have the necessary maps for each queue we've been given.
        matchmakingStore.playlists.forEach(async (queue) => {
            matchmakingStore.downloadsRequired[queue.id] = { needed: await checkIfAnyMapsAreNeeded(queue.maps) };
        });
    } catch (error) {
        console.error("Tachyon error: matchmaking/list:", error);
        notificationsApi.alert({ text: i18n.global.t("lobby.multiplayer.ranked.errors.listRequest"), severity: "error" });
        matchmakingStore.queueError = i18n.global.t("lobby.multiplayer.ranked.errors.queueListUnavailable");
    } finally {
        matchmakingStore.isLoadingQueues = false;
    }
}

async function checkIfAnyMapsAreNeeded(maps: { springName: string }[]): Promise<boolean> {
    if (maps.length == 0) return false;
    const queueMaps = maps.map((m) => m.springName);
    const dbMaps = await db.maps.bulkGet(queueMaps);
    for (const map of dbMaps) {
        if (map == undefined || !map.isInstalled) return true;
    }
    return false;
}

export function getPlaylistName(id: string): string {
    const playlist = matchmakingStore.playlists.find((playlist) => playlist.id === id);
    return playlist?.name || id;
}

async function sendQueueRequest() {
    const selectedQueue = matchmakingStore.selectedQueue;
    if (!selectedQueue) {
        notificationsApi.alert({ text: i18n.global.t("lobby.multiplayer.ranked.errors.badQueueData"), severity: "error" });
        await sendListRequest();
        return;
    }
    if (matchmakingStore.downloadsRequired[selectedQueue.id] == undefined) {
        notificationsApi.alert({ text: i18n.global.t("lobby.multiplayer.ranked.errors.badQueueData"), severity: "error" });
        await sendListRequest();
        return;
    }
    if (matchmakingStore.downloadsRequired[selectedQueue.id].needed) {
        notificationsApi.alert({ text: i18n.global.t("lobby.multiplayer.ranked.errors.downloadsRequired"), severity: "info" });
        return;
    }
    matchmakingStore.status = MatchmakingStatus.JoinRequested; // Initial state, likely short-lived.
    try {
        matchmakingStore.errorMessage = null;
        await tachyonRequest("matchmaking/queue", {
            queues: [{ id: selectedQueue.id, version: selectedQueue.version }],
        });
        console.log("Tachyon: matchmaking/queue: success");
        matchmakingStore.status = MatchmakingStatus.Searching;
    } catch (error) {
        if (isTachyonErrorForCommand(error, "matchmaking/queue")) {
            switch (error.response.reason) {
                case "version_mismatch":
                    notificationsApi.alert({
                        text: i18n.global.t("lobby.multiplayer.ranked.errors.versionMismatch"),
                        severity: "warning",
                    });
                    await sendListRequest();
                    matchmakingStore.errorMessage = i18n.global.t("lobby.multiplayer.ranked.errors.queueChangedRetry");
                    matchmakingStore.status = MatchmakingStatus.Idle;
                    break;
                default:
                    notificationsApi.alert({ text: i18n.global.t("lobby.multiplayer.ranked.errors.queueRequest"), severity: "error" });
                    matchmakingStore.errorMessage = i18n.global.t("lobby.multiplayer.ranked.errors.queueRequestFailed");
                    matchmakingStore.status = MatchmakingStatus.Idle;
                    break;
            }
        } else {
            console.error("Tachyon error: matchmaking/queue:", error);
            notificationsApi.alert({ text: i18n.global.t("lobby.multiplayer.ranked.errors.queueRequest"), severity: "error" });
            matchmakingStore.errorMessage = i18n.global.t("lobby.multiplayer.ranked.errors.queueRequestFailed");
            matchmakingStore.status = MatchmakingStatus.Idle;
        }
    }
}

async function sendCancelRequest() {
    matchmakingStore.status = MatchmakingStatus.Idle;
    try {
        const response = await window.tachyon.request("matchmaking/cancel");
        console.log("Tachyon: matchmaking/cancel:", response.status);
    } catch (error) {
        console.error("Tachyon: matchmaking/cancel:", error);
        notificationsApi.alert({ text: i18n.global.t("lobby.multiplayer.ranked.errors.cancelRequest"), severity: "error" });
        matchmakingStore.errorMessage = i18n.global.t("lobby.multiplayer.ranked.errors.cancelRequestFailed");
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
        notificationsApi.alert({ text: i18n.global.t("lobby.multiplayer.ranked.errors.readyRequest"), severity: "error" });
        matchmakingStore.errorMessage = i18n.global.t("lobby.multiplayer.ranked.errors.readyRequestFailed");
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
