// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
import { app } from "electron";
import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { extractLobbyProtocolUrl, getLobbyProtocolLabels, routeLobbyProtocolUrl } from "@main/lobbyProtocol";

const log = logger("lobby-protocol.service.ts");

let currentWebContents: BarIpcWebContents | null = null;
let rendererReady = false;
const pendingLobbyProtocolUrls: string[] = [];
let secondInstanceListenerRegistered = false;

function deliverOrQueueLobbyProtocolUrl(url: string): void {
    if (rendererReady && currentWebContents) {
        routeLobbyProtocolUrl(url, currentWebContents);
        return;
    }

    pendingLobbyProtocolUrls.push(url);
}

function flushPendingLobbyProtocolUrls(): void {
    if (!rendererReady || !currentWebContents || pendingLobbyProtocolUrls.length === 0) return;

    const urlsToFlush = pendingLobbyProtocolUrls.splice(0);
    log.info(`Dispatching pending protocol URLs: ${urlsToFlush.join(", ")}`);
    for (const url of urlsToFlush) {
        routeLobbyProtocolUrl(url, currentWebContents);
    }
}

function registerSecondInstanceListener(): void {
    if (secondInstanceListenerRegistered) return;

    secondInstanceListenerRegistered = true;
    app.on("second-instance", (_event, argv) => {
        const lobbyProtocolUrl = extractLobbyProtocolUrl(argv);
        if (lobbyProtocolUrl) {
            log.info(`Protocol URL from second instance: ${lobbyProtocolUrl}`);
            deliverOrQueueLobbyProtocolUrl(lobbyProtocolUrl);
        }
    });
}

registerSecondInstanceListener();

function registerIpcHandlers(webContents: BarIpcWebContents) {
    currentWebContents = webContents;
    registerSecondInstanceListener();

    webContents.ipc.handle("lobbyProtocol:getLabels", () => getLobbyProtocolLabels());

    webContents.ipc.handle("lobbyProtocol:handleUrl", (_event, url: string) => {
        log.info(`Protocol URL from renderer: ${url}`);
        routeLobbyProtocolUrl(url, webContents);
    });

    webContents.ipc.handle("lobbyProtocol:handlePending", () => {
        rendererReady = true;
        flushPendingLobbyProtocolUrls();
    });

    const startupUrl = extractLobbyProtocolUrl(process.argv);
    if (startupUrl) {
        log.info(`Protocol URL on startup, deferring until UI ready: ${startupUrl}`);
        deliverOrQueueLobbyProtocolUrl(startupUrl);
    }

    flushPendingLobbyProtocolUrls();
}

export const lobbyProtocolService = {
    registerIpcHandlers: (webContents: BarIpcWebContents) => registerIpcHandlers(webContents),
};
