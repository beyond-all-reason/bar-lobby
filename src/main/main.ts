import { app, net, protocol, session } from "electron";
import path from "path";
import url from "url";

import { createWindow } from "@main/main-window";
import { settingsService } from "./services/settings.service";
import { infoService } from "./services/info.service";
import { accountService } from "./services/account.service";
import engineService from "./services/engine.service";
import mapsService from "./services/maps.service";
import gameService from "./services/game.service";
import { logger } from "./utils/logger";
import { APP_NAME, CONTENT_PATH } from "./config/app";
import { shellService } from "@main/services/shell.service";
import downloadsService from "@main/services/downloads.service";
import replaysService from "@main/services/replays.service";
import { miscService } from "@main/services/news.service";
import { autoUpdaterService } from "@main/services/auto-updater.service";
import { replayContentAPI } from "@main/content/replays/replay-content";
import { authService } from "@main/services/auth.service";
import { tachyonService } from "@main/services/tachyon.service";

const log = logger("main/index.ts");
log.info("Starting Electron main process");

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

if (process.env.NODE_ENV === "production" && !app.requestSingleInstanceLock()) {
    app.quit();
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
            if (!resolvedFilePath.startsWith(CONTENT_PATH)) {
                throw new Error(`Attempt to access file outside content folder <${resolvedFilePath}>`);
            }
            return net.fetch(url.pathToFileURL(resolvedFilePath).toString());
        } catch (err) {
            log.error(err);
        }
    });
}

function replayFileOpenedWithTheApp() {
    if (process.argv.length == 0 || process.argv[process.argv.length - 1].endsWith(".sdfz")) {
        return process.argv[process.argv.length - 1];
    }
}

app.setName(APP_NAME);
app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");
app.on("window-all-closed", () => app.quit());

// Security
app.enableSandbox();

app.commandLine.appendSwitch("high-dpi-support", "1");
app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.commandLine.appendSwitch("disable-pinch", "1");

app.whenReady().then(async () => {
    registerBarFileProtocol();

    if (process.env.NODE_ENV !== "production") {
        try {
            // await installExtension(VUEJS_DEVTOOLS);
        } catch (err) {
            log.error("Vue Devtools failed to install:", err?.toString());
        }
    } else if (app.isPackaged && process.env.NODE_ENV === "production") {
        autoUpdaterService.init();
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
    await Promise.all([settingsService.init(), accountService.init(), replaysService.init(), gameService.init(), mapsService.init()]);

    const mainWindow = createWindow();

    // Handlers may need the mainWindow to send events
    infoService.registerIpcHandlers();
    settingsService.registerIpcHandlers();
    authService.registerIpcHandlers();
    tachyonService.registerIpcHandlers(mainWindow);
    replaysService.registerIpcHandlers(mainWindow);
    engineService.registerIpcHandlers();
    gameService.registerIpcHandlers(mainWindow);
    mapsService.registerIpcHandlers(mainWindow);
    shellService.registerIpcHandlers();
    downloadsService.registerIpcHandlers(mainWindow);
    miscService.registerIpcHandlers();

    const file = replayFileOpenedWithTheApp();
    if (file) {
        log.info(`Opening replay file: ${file}`);
        replayContentAPI.copyParseAndLaunchReplay(file);
    }
});
