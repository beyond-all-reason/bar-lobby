// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { IpcResult } from "@main/typed-ipc";
import { notificationsApi } from "@renderer/api/notifications";
import { setupI18n } from "@renderer/i18n";

const i18n = setupI18n();

// Failing to open a folder or a link isn't worth interrupting anyone over, but it shouldn't be
// swallowed either - the OS reason is the only clue a player has about what went wrong.
export async function openAndReport(open: () => Promise<IpcResult>) {
    const result = await open();
    if (result.status === "success") return;

    notificationsApi.alert({
        text: i18n.global.t("lobby.api.shell.openFailed", { details: result.details ?? result.reason }),
        severity: "error",
    });
}
