// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { notificationsApi } from "@renderer/api/notifications";
import { alertQueueListFailed } from "@renderer/composables/useMatchmakingActions";
import type { Ui } from "@renderer/logic/ui";
import { router } from "@renderer/router";

function openMatchmaking() {
    router.push("/play/matchmaking");
}

export const appUi: Ui = {
    matchWaiting: openMatchmaking,
    queuesJoined() {
        notificationsApi.alert({ text: "Successfully joined matchmaking queue(s)", severity: "info" });
    },
    queueListFailed: alertQueueListFailed,
};
