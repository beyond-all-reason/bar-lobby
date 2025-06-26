// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app, net, protocol, session } from "electron";
import path from "path";
import url from "url";

import { APP_NAME, SCENARIO_IMAGE_PATH } from "./config/app";
import netFromNode from "node:net";

// Enable happy eyeballs for IPv6/IPv4 dual stack.
netFromNode.setDefaultAutoSelectFamily(true);

const gotTheLock = app.requestSingleInstanceLock();

// if (process.env.NODE_ENV === "production" && !gotTheLock) {
//     app.quit();
// }

if (!gotTheLock) {
    app.quit();
} else {
    (async () => {
        if (process.env.NODE_ENV !== "production") {
            if (process.platform === "win32") {
                process.on("message", (data) => {
                    if (data === "graceful-exit") {
                        app.quit();
                    }
                });
            } else {
                process.on("SIGTERM", () => {
                    app.quit();
                });
            }
        }

        // Import all services and utilities after acquiring the lock
        const { createWindow } = await import("@main/main-window");
        const { settingsService } = await import("./services/settings.service");
        const { infoService } = await import("./services/info.service");
        const { accountService } = await import("./services/account.service");
        const { logService } = await import("@main/services/log.service");
        const engineService = (await import("./services/engine.service")).default;
        const mapsService = (await import("./services/maps.service")).default;
        const gameService = (await import("./services/game.service")).default;
        const { shellService } = await import("@main/services/shell.service");
        const downloadsService = (await import("@main/services/downloads.service")).default;
        const replaysService = (await import("@main/services/replays.service")).default;
        const { miscService } = await import("@main/services/news.service");
        const autoUpdaterService = (await import("@main/services/auto-updater.service")).default;
        const { authService } = await import("@main/services/auth.service");
        const { tachyonService } = await import("@main/services/tachyon.service");
        const { typedWebContents } = await import("@main/typed-ipc");
        const { navigationService } = await import("@main/services/navigation.service");
        const { logger } = await import("./utils/logger");

        const log = logger("main/index.ts");
        log.info("Starting Electron main process");
        log.info("App instance lock acquired successfully.");

        protocol.registerSchemesAsPrivileged([
            {
                scheme: "bar",
                privileges: {
                    bypassCSP: true,
                },
            },
        ]);

        function registerBarFileProtocol() {
            protocol.handle("bar", (request) => {
                try {
                    const decodedUrl = decodeURIComponent(request.url);
                    const filePath = decodedUrl.slice("bar://".length);
                    // Security Check: Ensure the file is within the content folder
                    const resolvedFilePath = path.resolve(filePath);
                    const whitelistedPaths = [SCENARIO_IMAGE_PATH];
                    if (!whitelistedPaths.some((p) => resolvedFilePath.startsWith(p + path.sep))) {
                        log.error(`Attempt to access file outside whitelisted paths: ${resolvedFilePath}`);
                        return new Response();
                    }
                    return net.fetch(url.pathToFileURL(resolvedFilePath).toString());
                } catch (err) {
                    log.error(err);
                    return new Response();
                }
            });
        }

        app.setName(APP_NAME);
        app.on("window-all-closed", () => app.quit());

        // Security
        app.enableSandbox();

        // Command line switches
        app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");
        app.commandLine.appendSwitch("disable-pinch", "1");

        app.whenReady().then(async () => {
            registerBarFileProtocol();
            if (process.env.NODE_ENV !== "production") {
                try {
                    // await installExtension(VUEJS_DEVTOOLS);
                } catch (err) {
                    log.error("Vue Devtools failed to install:", err?.toString());
                }
            }
            // Define CSP for all webContents
            session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
                callback({
                    responseHeaders: {
                        ...details.responseHeaders,
                        "Content-Security-Policy": ["default-src 'self' 'unsafe-inline' blob: data:"],
                    },
                });
            });
            // Initialize services
            await engineService.init();
            await Promise.all([settingsService.init(), accountService.init(), replaysService.init(), gameService.init(), mapsService.init(), autoUpdaterService.init()]);
            const mainWindow = createWindow();
            const webContents = typedWebContents(mainWindow.webContents);
            // Handlers may need the webContents to send events
            logService.registerIpcHandlers();
            infoService.registerIpcHandlers();
            settingsService.registerIpcHandlers();
            authService.registerIpcHandlers();
            tachyonService.registerIpcHandlers(webContents);
            replaysService.registerIpcHandlers(webContents);
            engineService.registerIpcHandlers();
            gameService.registerIpcHandlers(webContents);
            mapsService.registerIpcHandlers(webContents);
            shellService.registerIpcHandlers();
            downloadsService.registerIpcHandlers(webContents);
            miscService.registerIpcHandlers();
            autoUpdaterService.registerIpcHandlers();
            navigationService.registerIpcHandlers(webContents);
        });
    })();
}
