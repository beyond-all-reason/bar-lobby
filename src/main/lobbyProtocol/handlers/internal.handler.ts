// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { registerLobbyProtocolAction } from "../lobby-protocol-router";

registerLobbyProtocolAction(
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

registerLobbyProtocolAction(
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

registerLobbyProtocolAction(
    "internal",
    "replays",
    (_url, webContents) => {
        webContents.send("navigation:navigateTo", "/watch/replays");
    },
    { label: "Go to Replays" }
);
