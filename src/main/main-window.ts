// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app, BrowserWindow, ipcMain, nativeImage, screen } from "electron";
import path from "path";
import { settingsService } from "./services/settings.service";
import { logger } from "./utils/logger";
import icon from "@main/resources/icon.png";
import { purgeLogFiles } from "@main/services/log.service";
import { typedWebContents } from "@main/typed-ipc";
import { gameAPI } from "@main/game/game";

const ZOOM_FACTOR_BASELINE_HEIGHT = 1080;

const log = logger("main-window");

const isWaylandNative = process.env.ELECTRON_OZONE_PLATFORM_HINT === "auto" || process.env.ELECTRON_OZONE_PLATFORM_HINT === "wayland";

//TODO handle display changes, e.g. when the user changes the display in the settings,
// moves the window to another display, or when the display is disconnected
// be mindful of the scale factor for each display
export function createWindow() {
    const settings = settingsService.getSettings();
    log.info("Creating main window with settings: ", settings);

    const mainWindow = new BrowserWindow({
        title: "Beyond All Reason",
        fullscreen: settings?.fullscreen || false,
        icon: nativeImage.createFromDataURL(icon),
        resizable: true,
        center: true,
        frame: false,
        show: false,
        autoHideMenuBar: true,
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

    function updateDimensionsAndScaling(size?: number) {
        log.debug(`Updating dimensions and scaling for main window with size: ${size}`);
        const primaryDisplay = screen.getPrimaryDisplay();
        const deviceScaleFactor = ZOOM_FACTOR_BASELINE_HEIGHT / primaryDisplay.size.height;
        const windowedHeight = size || settingsService.getSettings()?.size || 900;
        const height = mainWindow.isFullScreen() || mainWindow.isMaximized() ? primaryDisplay.size.height : Math.round(windowedHeight / deviceScaleFactor);
        const width = mainWindow.isFullScreen() || mainWindow.isMaximized() ? primaryDisplay.size.width : Math.round((height * 16) / 9);

        if (!mainWindow.isFullScreen() && !mainWindow.isMaximized()) {
            mainWindow.setSize(width, height);
            mainWindow.center();
        }

        // Workaround to resize the window on Wayland native.
        if (isWaylandNative) webContents.mainFrame.executeJavaScript(`window.resizeTo(${width}, ${height});`, true);

        const zoomFactor = height / ZOOM_FACTOR_BASELINE_HEIGHT;
        webContents.setZoomFactor(zoomFactor);
        log.info(`Main window dimensions set to ${width}x${height}, zoom factor: ${zoomFactor}`);
    }

    function updateScaling() {
        const primaryDisplay = screen.getPrimaryDisplay();
        const deviceScaleFactor = ZOOM_FACTOR_BASELINE_HEIGHT / primaryDisplay.size.height;
        const windowedHeight = settingsService.getSettings()?.size || 900;
        const height = mainWindow.isFullScreen() || mainWindow.isMaximized() ? primaryDisplay.size.height : Math.round(windowedHeight / deviceScaleFactor);
        const zoomFactor = height / ZOOM_FACTOR_BASELINE_HEIGHT;
        webContents.setZoomFactor(zoomFactor);
        log.info(`Main window zoom factor set to ${zoomFactor}`);
    }

    process.env.MAIN_WINDOW_ID = mainWindow.id.toString();
    log.debug("Settings: ", settings);

    mainWindow.once("ready-to-show", () => {
        // Open the DevTools.
        if (process.env.NODE_ENV === "development") {
            log.debug(`NODE_ENV is development, opening dev tools`);
            webContents.openDevTools();
        }
        updateDimensionsAndScaling();
        mainWindow.setMenuBarVisibility(false);
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on("maximize", () => updateScaling());
    mainWindow.on("unmaximize", () => updateScaling());

    // Display metrics changed (resolution, scale factor, etc.)
    screen.on("display-metrics-changed", (event, display) => {
        if (display.id === screen.getPrimaryDisplay().id) {
            log.info("Primary display metrics changed, updating main window dimensions and scaling");
            updateDimensionsAndScaling();
        }
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
    ipcMain.handle("mainWindow:setFullscreen", (_event, flag: boolean, size: number) => {
        mainWindow.setFullScreen(flag);
        updateDimensionsAndScaling(size);
    });
    ipcMain.handle("mainWindow:setSize", (_event, size: number) => {
        updateDimensionsAndScaling(size);
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
