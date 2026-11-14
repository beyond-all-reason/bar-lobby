// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { isApiFailure } from "@renderer/api/failures";
import { notificationsApi } from "@renderer/api/notifications";
import { isTachyonError } from "@renderer/api/tachyon";

export function alertRequestFailure(error: unknown, commandId: string) {
    let failedCommand = commandId;
    if (isTachyonError(error)) {
        failedCommand = error.commandId;
    } else if (!isApiFailure(error)) {
        console.error(`Error with request ${commandId}`, error);
    }

    notificationsApi.alert({ text: `Error with request ${failedCommand}`, severity: "error" });
}
