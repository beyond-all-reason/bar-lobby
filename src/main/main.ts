// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app } from "electron";

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.exit(0);
}

// Only import after we know we have the lock
import { net, protocol, session } from "electron";
import path from "path";
import url from "url";
import netFromNode from "node:net";

import { createWindow } from "@main/main-window";
import { settingsService } from "./services/settings.service";
import { infoService } from "./services/info.service";
import { accountService } from "./services/account.service";
import { logService } from "@main/services/log.service";
import engineService from "./services/engine.service";
import mapsService from "./services/maps.service";
import gameService from "./services/game.service";
import { logger } from "./utils/logger";
import { APP_NAME, SCENARIO_IMAGE_PATH } from "./config/app";
import { shellService } from "@main/services/shell.service";
import downloadsService from "@main/services/downloads.service";
import replaysService from "@main/services/replays.service";
import { miscService } from "@main/services/news.service";
import autoUpdaterService from "@main/services/auto-updater.service";
import { authService } from "@main/services/auth.service";
import { tachyonService } from "@main/services/tachyon.service";
import { typedWebContents } from "@main/typed-ipc";
import { navigationService } from "@main/services/navigation.service";

// Enable happy eyeballs for IPv6/IPv4 dual stack.
netFromNode.setDefaultAutoSelectFamily(true);

const log = logger("main/index.ts");
log.info("Starting Electron main process");
log.info("App instance lock acquired successfully.");

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
app.commandLine.appendSwitch("force-device-scale-factor", "1");

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
        const csp = {
            "default-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "blob:", "data:"],
            "media-src": ["'self'", "data:"],
        };
        // Those additional rules are needed when vue dev tools are injected.
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
            csp["img-src"].push("https://vue-i18n.intlify.dev/");
            csp["script-src"] = ["'self'", "'unsafe-inline'"];
            csp["font-src"] = ["'self'", "https://fonts.gstatic.com/"];
        }
        const cspHeader = Object.entries(csp)
            .map(([k, v]) => [k, ...v].join(" "))
            .join("; ");
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": [cspHeader],
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
