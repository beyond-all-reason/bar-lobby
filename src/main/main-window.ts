// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app, BrowserWindow, ipcMain, nativeImage } from "electron";
import path from "path";
import { settingsService } from "./services/settings.service";
import { logger } from "./utils/logger";
import icon from "@main/resources/icon.png";
import { purgeLogFiles } from "@main/services/log.service";
import { typedWebContents } from "@main/typed-ipc";
import { gameAPI } from "@main/game/game";

const ZOOM_FACTOR_BASELINE_HEIGHT = 1080;

const log = logger("main-window");

export function createWindow() {
    const settings = settingsService.getSettings();
    log.info("Creating main window with settings: ", settings);

    const height = settings.size || 900;
    const width = Math.round((height * 16) / 9);

    const mainWindow = new BrowserWindow({
        title: "Beyond All Reason",
        fullscreen: settings?.fullscreen || false,
        icon: nativeImage.createFromDataURL(icon),
        width: width,
        height: height,
        minWidth: 1280,
        minHeight: 720,
        resizable: true,
        center: true,
        frame: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "../build/preload.js"),
            zoomFactor: 1,
            spellcheck: false,
        },
    });

    const webContents = typedWebContents(mainWindow.webContents);

    // Disable zoom shortcuts in production
    if (process.env.NODE_ENV === "production") {
        webContents.on("before-input-event", (event, input) => {
            // Block Ctrl/Cmd + '+', '-', '0' (zoom shortcuts)
            if (((input.control || input.meta) && (input.key === "+" || input.key === "-" || input.key === "=")) || (input.key === "0" && (input.control || input.meta))) {
                event.preventDefault();
            }
        });
    }

    function setZoomFactor() {
        const zoomFactor = mainWindow.getContentSize()[1] / ZOOM_FACTOR_BASELINE_HEIGHT;
        console.debug("Window size: ", mainWindow.getContentSize());
        console.debug("Zoom factor: ", zoomFactor);
        // prevent breaking when minimizing
        if (zoomFactor > 0) {
            webContents.zoomFactor = zoomFactor;
        }
    }
    setZoomFactor();

    process.env.MAIN_WINDOW_ID = mainWindow.id.toString();
    log.debug("Settings: ", settings);

    mainWindow.once("ready-to-show", () => {
        // Open the DevTools.
        if (process.env.NODE_ENV === "development") {
            log.debug(`NODE_ENV is development, opening dev tools`);
            webContents.openDevTools();
        }
        mainWindow.setMenuBarVisibility(false);
        mainWindow.show();
        mainWindow.focus();
    });

    webContents.on("render-process-gone", (event, details) => {
        console.error(details);
    });

    // Disable new window creation
    webContents.setWindowOpenHandler(() => {
        return { action: "deny" };
    });

    // and load the index.html of the app.
    if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    } else {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    }

    mainWindow.on("restore", () => mainWindow.flashFrame(false));

    app.on("browser-window-focus", () => mainWindow.flashFrame(false));

    //TODO add an IPC handler for changing display via the settings

    // Register IPC handlers for the main window
    ipcMain.handle("mainWindow:setFullscreen", (_event, flag: boolean, size: number) => {
        mainWindow.setFullScreen(flag);
        if (!flag) {
            mainWindow.setSize(Math.round((size * 16) / 9), size, true);
            mainWindow.center();
        }
        setZoomFactor();
    });
    ipcMain.handle("mainWindow:setSize", (_event, size: number) => {
        mainWindow.setSize(Math.round((size * 16) / 9), size, true);
        if (!mainWindow.isFullScreen()) {
            mainWindow.center();
            setZoomFactor();
        }
    });
    ipcMain.handle("mainWindow:flashFrame", (_event, flag: boolean) => {
        mainWindow.flashFrame(flag);
    });
    ipcMain.handle("mainWindow:minimize", () => mainWindow.minimize());
    ipcMain.handle("mainWindow:isFullscreen", () => mainWindow.isFullScreen());

    /////////////////////////////////////////////
    // Subscribe to game events
    /////////////////////////////////////////////
    gameAPI.onGameLaunched.add(() => {
        log.info("Game launched - hiding main window");
        mainWindow.hide();
    });

    gameAPI.onGameClosed.add(() => {
        log.info("Game closed - showing main window");
        mainWindow.show();
        mainWindow.focus();
    });

    // Purge old log files
    purgeLogFiles();

    return mainWindow;
}
