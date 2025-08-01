// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app, BrowserWindow, nativeImage } from "electron";
import path from "path";
import { settingsService } from "./services/settings.service";
import { logger } from "./utils/logger";
import icon from "@main/resources/icon.png";
import { purgeLogFiles } from "@main/services/log.service";
import { typedWebContents, ipcMain } from "@main/typed-ipc";
import { gameAPI } from "@main/game/game";

const ZOOM_FACTOR_BASELINE_HEIGHT = 1080;

const log = logger("main-window");

export function createWindow() {
    const settings = settingsService.getSettings();
    log.info("Creating main window with settings: ", settings);

    function getWindowSize(windowedHeight: number) {
        return {
            width: (windowedHeight * 16) / 9,
            height: windowedHeight,
        };
    }

    const mainWindow = new BrowserWindow({
        title: "Beyond All Reason",
        fullscreen: settings.fullscreen,
        icon: nativeImage.createFromDataURL(icon),
        resizable: true,
        center: true,
        frame: false,
        show: false,
        autoHideMenuBar: true,
        ...getWindowSize(settings.size),
        minWidth: 640,
        minHeight: 360,
        webPreferences: {
            preload: path.join(__dirname, "../build/preload.js"),
            zoomFactor: 1,
            spellcheck: false,
        },
    });

    const webContents = typedWebContents(mainWindow.webContents);

    // Disable zoom shortcuts
    webContents.on("before-input-event", (event, input) => {
        // Block Ctrl/Cmd + '+', '-', '0' (zoom shortcuts)
        if (((input.control || input.meta) && (input.key === "+" || input.key === "-" || input.key === "=")) || (input.key === "0" && (input.control || input.meta))) {
            event.preventDefault();
        }
    });

    // We cache previous zoom value to prevent repeating setZoomFactor calls with
    // the same value as that seems to trigger event loops with the renderer.
    let previousZoomFactor = -1;

    function updateZoom() {
        if (mainWindow.getContentSize()[1] > 0) {
            const zoomFactor = mainWindow.getContentSize()[1] / ZOOM_FACTOR_BASELINE_HEIGHT;
            if (Math.abs(previousZoomFactor - zoomFactor) > 0.001) {
                webContents.setZoomFactor(zoomFactor);
                previousZoomFactor = zoomFactor;
            }
        }
    }

    // We handle direct window `resize` event, not only `mainWindow:resized` from renderer as
    // that offers much lower latency and offers more fluid experience when resizing. We can't
    // use only `resize` event as looks like under some platforms not all window shape changes
    // trigger this event.
    mainWindow.on("resize", () => {
        updateZoom();
    });

    process.env.MAIN_WINDOW_ID = mainWindow.id.toString();

    mainWindow.once("ready-to-show", () => {
        // Open the DevTools.
        if (process.env.NODE_ENV === "development") {
            log.debug(`NODE_ENV is development, opening dev tools`);
            webContents.openDevTools();
        }
        mainWindow.setMenuBarVisibility(false);
        updateZoom();
        mainWindow.center();
        mainWindow.show();
        mainWindow.focus();
    });

    webContents.on("render-process-gone", (event, details) => {
        log.error(details);
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
    ipcMain.handle("mainWindow:setFullscreen", (_event, flag: boolean) => {
        mainWindow.setFullScreen(flag);
        updateZoom();
    });
    ipcMain.handle("mainWindow:setSize", (_event, size: number) => {
        if (!mainWindow.isFullScreen() && !mainWindow.isMaximized()) {
            const { width, height } = getWindowSize(size);
            mainWindow.setSize(width, height);
        }
        updateZoom();
    });
    ipcMain.handle("mainWindow:flashFrame", (_event, flag: boolean) => {
        mainWindow.flashFrame(flag);
    });
    ipcMain.handle("mainWindow:minimize", () => mainWindow.minimize());
    ipcMain.handle("mainWindow:isFullscreen", () => mainWindow.isFullScreen());

    ipcMain.handle("mainWindow:resized", () => {
        updateZoom();
    });

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
