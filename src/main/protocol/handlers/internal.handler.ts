// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { registerProtocolAction } from "../protocol-router";

registerProtocolAction(
    "internal",
    "test",
    (_url, webContents) => {
        webContents.send("notifications:showAlert", {
            text: "Great, protocol works",
            severity: "info",
            timeoutMs: 8000,
        });
    },
    { label: "Test notification" }
);

registerProtocolAction(
    "internal",
    "ping",
    (_url, webContents) => {
        webContents.send("notifications:showAlert", {
            text: "Pong!",
            severity: "info",
        });
    },
    { label: "Ping!" }
);

registerProtocolAction(
    "internal",
    "replays",
    (_url, webContents) => {
        webContents.send("navigation:navigateTo", "/watch/replays");
    },
    { label: "Go to Replays" }
);
