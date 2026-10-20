// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import {
    MatchmakingCancelledEventData,
    MatchmakingFoundEventData,
    MatchmakingFoundUpdateEventData,
    MatchmakingQueuesJoinedEventData,
    MatchmakingQueueUpdateEventData,
    PrivateUser,
    UserSelfEventData,
} from "tachyon-protocol/types";
import { contentApi } from "@renderer/api/content";
import { isApiFailure } from "@renderer/api/failures";
import { gameApi } from "@renderer/api/game";
import { isTachyonErrorForCommand, onTachyonEvent, tachyonRequest } from "@renderer/api/tachyon";
import { ui } from "@renderer/logic/ui";
import { matchmakingStore, matchmakingUpdates, MatchmakingStatus } from "@renderer/store/matchmaking.store";
import { tachyonStore } from "@renderer/store/tachyon.store";
import { onTachyonConnected } from "@renderer/utils/connection-signal";
import { onWentOffline } from "@renderer/utils/offline-signal";

// The server is the authority on the real ready-up deadline and will send its own
// matchmaking/cancelled event if we miss it; this margin just narrows the window
// where our local countdown and the server's deadline can disagree.
const READY_TIMEOUT_SAFETY_MARGIN_MS = 100;

export class MatchmakingJoinRefused extends Error {
    readonly reason: "bad_queue_data" | "downloads_required" | "queue_not_found";

    constructor(reason: MatchmakingJoinRefused["reason"]) {
        super(`matchmaking/queue not sent: ${reason}`);
        this.name = "MatchmakingJoinRefused";
        this.reason = reason;
    }
}

let isInitialized = false;
let readyTimeout: ReturnType<typeof setTimeout> | undefined;
let readyCountdown: ReturnType<typeof setInterval> | undefined;

function clearReadyTimers() {
    clearTimeout(readyTimeout);
    clearInterval(readyCountdown);
    readyTimeout = undefined;
    readyCountdown = undefined;

    matchmakingUpdates.set({ readySecondsRemaining: undefined });
}

// Deadline is our local prediction of the server's timeout, not the source of truth for it.
function startReadyCountdown(deadline: number) {
    const secondsLeft = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

    matchmakingUpdates.set({ readySecondsRemaining: secondsLeft() });
    readyCountdown = setInterval(() => matchmakingUpdates.set({ readySecondsRemaining: secondsLeft() }), 1000);
    readyTimeout = setTimeout(() => {
        clearReadyTimers();
        matchmakingUpdates.set({ status: MatchmakingStatus.Idle });
    }, deadline - Date.now());
}

/**
 * Sends a Tachyon 'matchmaking/list' request to get the latest matchmaking queues
 */
async function listQueues() {
    matchmakingUpdates.set({ isLoadingQueues: true, queueError: undefined });
    try {
        const response = await tachyonRequest("matchmaking/list");
        console.log("Tachyon: matchmaking/list:", response.data);

        matchmakingUpdates.set({ playlists: response.data.playlists });
        // Set default selected queue if current selection is not available
        const hasSelectedQueue = matchmakingStore.playlists.some((playlist) => playlist.id === matchmakingStore.selectedQueue);
        if (matchmakingStore.playlists.length > 0 && !hasSelectedQueue) {
            matchmakingUpdates.set({ selectedQueue: matchmakingStore.playlists[0].id });
        }

        await refreshRequiredDownloads();
    } catch (error) {
        matchmakingUpdates.set({ queueError: "Failed to retrieve available queues" });

        throw error;
    } finally {
        matchmakingUpdates.set({ isLoadingQueues: false });
    }
}

async function refreshQueues() {
    try {
        await listQueues();
    } catch (error) {
        if (!isApiFailure(error)) {
            console.error("Error with request matchmaking/list", error);
        }

        ui.queueListFailed();
    }
}

// TODO: Fix this root cause: the views and DownloadContentButton each run their own content:missing check and can
// disagree. The views only show the button while downloadsRequired lists something, and the button answers for itself,
// re-checking whenever contentsStore.revision changes. If this refresh fails after a download (#751), downloadsRequired
// keeps the finished content while the button has already seen it installed, so it renders as "ready" and shows its
// placeholder slot ("This string should never be visible"). The views currently paper over this by re-listing queues
// on failure, which still leaves the stale entries if that refresh fails too. One check should decide whether a queue
// needs downloads: either the views hide the button from its downloads-complete event, or the button owns that
// decision.
/**
 * Refreshes the downloadsRequired arrays upon demand, if we expect that things have changed.
 * Rejects with an IpcCallError when the content check fails, so callers must catch it or it reaches Error.vue.
 */
async function refreshRequiredDownloads() {
    for (const queue of matchmakingStore.playlists) {
        const missing = await contentApi.missing([
            ...queue.engines.map((engine) => ({ type: "engine" as const, id: engine.version })),
            ...queue.games.map((game) => ({ type: "game" as const, id: game.springName })),
            ...queue.maps.map((map) => ({ type: "map" as const, id: map.springName })),
        ]);

        matchmakingUpdates.setDownloadsRequired(queue.id, {
            engines: missing.filter((ref) => ref.type === "engine").map((ref) => ref.id),
            games: missing.filter((ref) => ref.type === "game").map((ref) => ref.id),
            maps: missing.filter((ref) => ref.type === "map").map((ref) => ref.id),
        });
    }
}

/**
 * Sends a Tachyon 'matchmaking/queue' request, specifically using the matchmakingStore.selectedQueue
 */
async function joinQueue() {
    const required = matchmakingStore.downloadsRequired[matchmakingStore.selectedQueue];
    if (required == undefined) {
        refreshQueues();

        throw new MatchmakingJoinRefused("bad_queue_data");
    }
    if (required.maps.length > 0 || required.engines.length > 0 || required.games.length > 0) {
        throw new MatchmakingJoinRefused("downloads_required");
    }

    // Initial state, likely short-lived.
    matchmakingUpdates.set({ status: MatchmakingStatus.JoinRequested, errorMessage: null });

    const playlist = matchmakingStore.playlists.find((p) => p.id === matchmakingStore.selectedQueue);
    if (!playlist) {
        refreshQueues().then(() => matchmakingUpdates.set({ status: MatchmakingStatus.Idle }));

        throw new MatchmakingJoinRefused("queue_not_found");
    }

    try {
        const response = await tachyonRequest("matchmaking/queue", {
            queues: [{ id: playlist.id, version: playlist.version }],
        });
        console.log("Tachyon: matchmaking/queue:", response.status);

        matchmakingUpdates.set({ status: MatchmakingStatus.Searching });
    } catch (error) {
        if (!isTachyonErrorForCommand(error, "matchmaking/queue")) {
            matchmakingUpdates.set({ errorMessage: "Error with matchmaking/queue", status: MatchmakingStatus.Idle });
        } else if (error.reason === "version_mismatch") {
            refreshQueues().then(() => matchmakingUpdates.set({ status: MatchmakingStatus.Idle }));
        } else {
            matchmakingUpdates.set({ status: MatchmakingStatus.Idle });
        }

        throw error;
    }
}

/**
 * Sends a Tachyon 'matchmaking/cancel' request.
 */
async function cancel() {
    clearReadyTimers();
    matchmakingUpdates.set({ status: MatchmakingStatus.Idle });

    try {
        const response = await tachyonRequest("matchmaking/cancel");
        console.log("Tachyon: matchmaking/cancel:", response.status);
    } catch (error) {
        matchmakingUpdates.set({ errorMessage: "Error with matchmaking/cancel" });

        throw error;
    }
}

/**
 * Sends a Tachyon 'matchmaking/ready' request.
 */
async function ready() {
    clearReadyTimers();
    matchmakingUpdates.set({ status: MatchmakingStatus.MatchAccepted });

    try {
        const response = await tachyonRequest("matchmaking/ready");
        console.log("Tachyon: matchmaking/ready:", response.status);
    } catch (error) {
        matchmakingUpdates.set({ status: MatchmakingStatus.Idle, errorMessage: "Error with matchmaking/ready" });

        throw error;
    }
}

function selectQueue(queue: string) {
    matchmakingUpdates.set({ selectedQueue: queue });
}

function onQueueUpdateEvent(data: MatchmakingQueueUpdateEventData) {
    console.log("Tachyon event: matchmaking/queueUpdate:", data);

    matchmakingUpdates.set({ playersQueued: data.playersQueued });
}

function onLostEvent() {
    console.log("Tachyon event: matchmaking/lost: no data");

    clearReadyTimers();
    matchmakingUpdates.set({ playersReady: 0, status: MatchmakingStatus.Searching });
}

function onFoundUpdateEvent(data: MatchmakingFoundUpdateEventData) {
    console.log("Tachyon event: matchmaking/foundUpdate", data);

    matchmakingUpdates.set({ playersReady: data.readyCount });
}

function onCancelledEvent(data: MatchmakingCancelledEventData) {
    console.log("Tachyon event: matchmaking/cancelled:", data);

    clearReadyTimers();
    matchmakingUpdates.set({ playersReady: 0, playersQueued: 0, status: MatchmakingStatus.Idle });
    if (data.reason === "version_changed") {
        refreshQueues();
    }
}

function onFoundEvent(data: MatchmakingFoundEventData) {
    console.log("Tachyon event: matchmaking/found:", data);

    clearReadyTimers();
    matchmakingUpdates.set({ status: MatchmakingStatus.MatchFound });
    startReadyCountdown(Date.now() + data.timeoutMs - READY_TIMEOUT_SAFETY_MARGIN_MS);
}

function onSelfUpdateFoundSignal(data: Extract<PrivateUser["matchmaking"], { state: "found" }>) {
    console.log("User/self update: matchmaking/found state:", data);

    clearReadyTimers();
    matchmakingUpdates.set({ selectedQueue: data.queue.id });
    if (data.queue.hasAlreadyReadied) {
        matchmakingUpdates.set({ status: MatchmakingStatus.MatchAccepted });
    } else {
        matchmakingUpdates.set({ status: MatchmakingStatus.MatchFound });
        // timeoutAt is a Unix timestamp in microseconds.
        startReadyCountdown(data.queue.timeoutAt / 1000 - READY_TIMEOUT_SAFETY_MARGIN_MS);
    }

    ui.matchWaiting();
}

function onUserSelfEvent({ user }: UserSelfEventData) {
    const data = user.matchmaking;
    console.log("User/self update: matchmaking:", data);

    switch (data.state) {
        case "no_matchmaking":
            clearReadyTimers();
            matchmakingUpdates.set({ playersReady: 0, playersQueued: 0, status: MatchmakingStatus.Idle });
            break;
        case "queuing":
            clearReadyTimers();
            matchmakingUpdates.set({ status: MatchmakingStatus.Searching });
            // We try to match to their selected queue, if it's available, or reset it if not.
            if (!matchmakingStore.selectedQueue || !data.queues.some((q) => q.id === matchmakingStore.selectedQueue)) {
                matchmakingUpdates.set({ selectedQueue: data.queues[0]?.id ?? "1v1" });
            }
            break;
        case "found":
            onSelfUpdateFoundSignal(data);
            break;
    }
}

function onQueuesJoinedEvent(data: MatchmakingQueuesJoinedEventData) {
    console.log("Tachyon event: matchmaking/queuesJoined:", data);

    // Current design is a single queue joined at a time. If the user has a *different* queue selected when their party joins, we switch so they match their party's selection.
    matchmakingUpdates.set({ selectedQueue: data.queues[0] });

    ui.queuesJoined();

    matchmakingUpdates.set({ status: MatchmakingStatus.Searching });
}

function onGameClosed() {
    if (matchmakingStore.status !== MatchmakingStatus.Idle) {
        matchmakingUpdates.set({ status: MatchmakingStatus.Idle });
    }
}

function clearOnlineState() {
    clearReadyTimers();
    matchmakingUpdates.clearOnlineState();
}

export async function initMatchmakingLogic() {
    if (isInitialized) {
        console.warn("Matchmaking logic is already initialized. Skipping initialization.");

        return;
    }

    onWentOffline.add(clearOnlineState);
    gameApi.onClosed(onGameClosed);
    onTachyonEvent("matchmaking/queueUpdate", onQueueUpdateEvent);
    onTachyonEvent("matchmaking/lost", onLostEvent);
    onTachyonEvent("matchmaking/foundUpdate", onFoundUpdateEvent);
    onTachyonEvent("matchmaking/cancelled", onCancelledEvent);
    onTachyonEvent("matchmaking/found", onFoundEvent);
    onTachyonEvent("matchmaking/queuesJoined", onQueuesJoinedEvent);
    onTachyonEvent("user/self", onUserSelfEvent);

    if (tachyonStore.isConnected) {
        await refreshQueues();
    }

    onTachyonConnected.add(() => refreshQueues());
    isInitialized = true;
}

export const matchmakingLogic = {
    listQueues,
    joinQueue,
    cancel,
    ready,
    selectQueue,
    refreshRequiredDownloads,
};
