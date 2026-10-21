// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { isApiFailure } from "@renderer/api/failures";
import { notificationsApi } from "@renderer/api/notifications";
import { isTachyonErrorForCommand } from "@renderer/api/tachyon";
import { MatchmakingJoinRefused, matchmakingLogic } from "@renderer/logic/matchmaking";
import { Alert } from "@renderer/model/notifications";
import { alertRequestFailure } from "@renderer/utils/alert-request-failure";

const joinRefusals: Record<MatchmakingJoinRefused["reason"], Omit<Alert, "id">> = {
    bad_queue_data: { text: "Bad queue data; refreshing list.", severity: "error" },
    downloads_required: { text: "You have downloads required to join this queue.", severity: "info" },
    queue_not_found: { text: "Selected queue not found. Refreshing list.", severity: "error" },
};

function logUnexpected(commandId: string, error: unknown) {
    if (!isApiFailure(error)) {
        console.error(`Error with request ${commandId}`, error);
    }
}

export function alertQueueListFailed() {
    notificationsApi.alert({ text: "Tachyon error: matchmaking/list", severity: "error" });
}

function alertJoinFailed(error: unknown) {
    if (error instanceof MatchmakingJoinRefused) {
        notificationsApi.alert(joinRefusals[error.reason]);

        return;
    }

    if (!isTachyonErrorForCommand(error, "matchmaking/queue")) {
        logUnexpected("matchmaking/queue", error);
        notificationsApi.alert({ text: "Tachyon error: matchmaking/queue", severity: "error" });

        return;
    }

    if (error.reason === "version_mismatch") {
        notificationsApi.alert({ text: "Queue version changed; refreshing list.", severity: "info" });
    } else if (error.reason === "party_missing_asset") {
        notificationsApi.alert({ text: "Party queue rejected, required assets are missing for the queue.", severity: "error" });
    } else {
        notificationsApi.alert({ text: `Queue request rejected for reason: ${error.reason}.`, severity: "error" });
    }
}

export function useMatchmakingActions() {
    async function listQueues() {
        try {
            await matchmakingLogic.listQueues();
        } catch (error) {
            logUnexpected("matchmaking/list", error);
            alertQueueListFailed();
        }
    }

    async function joinQueue() {
        try {
            await matchmakingLogic.joinQueue();
        } catch (error) {
            alertJoinFailed(error);
        }
    }

    async function ready() {
        try {
            await matchmakingLogic.ready();
        } catch (error) {
            logUnexpected("matchmaking/ready", error);
            notificationsApi.alert({ text: "Tachyon error: matchmaking/ready", severity: "error" });
        }
    }

    async function refreshRequiredDownloads() {
        try {
            await matchmakingLogic.refreshRequiredDownloads();
        } catch (error) {
            alertRequestFailure(error, "content:missing");
            // downloadsRequired is stale after a failed refresh, so rebuild it rather than leave the download button
            // up for content that is installed. listQueues catches its own failures.
            await listQueues();
        }
    }

    async function cancel() {
        try {
            await matchmakingLogic.cancel();
        } catch (error) {
            logUnexpected("matchmaking/cancel", error);
            notificationsApi.alert({ text: "Tachyon error: matchmaking/cancel", severity: "error" });
        }
    }

    return {
        listQueues,
        joinQueue,
        ready,
        cancel,
        selectQueue: matchmakingLogic.selectQueue,
        refreshRequiredDownloads,
    };
}
