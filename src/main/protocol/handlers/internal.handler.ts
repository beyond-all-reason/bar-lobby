// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { registerProtocolAction } from "../protocol-router";

registerProtocolAction("internal", "test", (_url, webContents) => {
    webContents.send("notifications:showAlert", {
        text: "Great, protocol works",
        severity: "info",
        timeoutMs: 8000,
    });
});

registerProtocolAction("internal", "ping", (_url, webContents) => {
    webContents.send("notifications:showAlert", {
        text: "Pong!",
        severity: "info",
    });
});
