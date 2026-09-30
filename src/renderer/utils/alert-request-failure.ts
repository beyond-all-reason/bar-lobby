// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { notificationsApi } from "@renderer/api/notifications";
import { isTachyonError } from "@renderer/api/tachyon";

export function alertRequestFailure(error: unknown, commandId: string) {
    let failedCommand = commandId;
    if (isTachyonError(error)) {
        failedCommand = error.commandId;
    } else {
        console.error(`Error with request ${commandId}`, error);
    }

    notificationsApi.alert({ text: `Error with request ${failedCommand}`, severity: "error" });
}
