// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
import { app, BrowserWindow } from "electron";
import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { extractLobbyProtocolUrl, getLobbyProtocolLabels, routeLobbyProtocolUrl } from "@main/lobbyProtocol";
import { typedWebContents } from "@main/typed-ipc";

const log = logger("lobby-protocol.service.ts");

let pendingLobbyProtocolUrl: string | null = null;

function registerIpcHandlers(webContents: BarIpcWebContents) {
    webContents.ipc.handle("lobbyProtocol:getLabels", () => getLobbyProtocolLabels());

    webContents.ipc.handle("lobbyProtocol:handleUrl", (_event, url: string) => {
        log.info(`Protocol URL from renderer: ${url}`);
        routeLobbyProtocolUrl(url, webContents);
    });

    webContents.ipc.handle("lobbyProtocol:handlePending", () => {
        if (pendingLobbyProtocolUrl) {
            log.info(`Dispatching pending protocol URL: ${pendingLobbyProtocolUrl}`);
            routeLobbyProtocolUrl(pendingLobbyProtocolUrl, webContents);
            pendingLobbyProtocolUrl = null;
        }
    });

    const startupUrl = extractLobbyProtocolUrl(process.argv);
    if (startupUrl) {
        log.info(`Protocol URL on startup, deferring until UI ready: ${startupUrl}`);
        pendingLobbyProtocolUrl = startupUrl;
    }

    app.on("second-instance", (_event, argv) => {
        const lobbyProtocolUrl = extractLobbyProtocolUrl(argv);
        if (lobbyProtocolUrl) {
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                log.info(`Protocol URL from second instance: ${lobbyProtocolUrl}`);
                routeLobbyProtocolUrl(lobbyProtocolUrl, typedWebContents(mainWindow.webContents));
            }
        }
    });
}

export const lobbyProtocolService = {
    registerIpcHandlers: (webContents: BarIpcWebContents) => registerIpcHandlers(webContents),
};
