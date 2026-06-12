// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
import { app, BrowserWindow } from "electron";
import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { extractProtocolUrl, getProtocolLabels, routeProtocolUrl } from "@main/protocol";
import { typedWebContents } from "@main/typed-ipc";

const log = logger("protocol.service.ts");

let pendingProtocolUrl: string | null = null;

function registerIpcHandlers(webContents: BarIpcWebContents) {
    webContents.ipc.handle("protocol:getLabels", () => getProtocolLabels());

    webContents.ipc.handle("protocol:handleUrl", (_event, url: string) => {
        log.info(`Protocol URL from renderer: ${url}`);
        routeProtocolUrl(url, webContents);
    });

    webContents.ipc.handle("protocol:handlePending", () => {
        if (pendingProtocolUrl) {
            log.info(`Dispatching pending protocol URL: ${pendingProtocolUrl}`);
            routeProtocolUrl(pendingProtocolUrl, webContents);
            pendingProtocolUrl = null;
        }
    });

    const startupUrl = extractProtocolUrl(process.argv);
    if (startupUrl) {
        log.info(`Protocol URL on startup, deferring until UI ready: ${startupUrl}`);
        pendingProtocolUrl = startupUrl;
    }

    app.on("second-instance", (_event, argv) => {
        const protocolUrl = extractProtocolUrl(argv);
        if (protocolUrl) {
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                log.info(`Protocol URL from second instance: ${protocolUrl}`);
                routeProtocolUrl(protocolUrl, typedWebContents(mainWindow.webContents));
            }
        }
    });
}

export const protocolService = {
    registerIpcHandlers: (webContents: BarIpcWebContents) => registerIpcHandlers(webContents),
};
