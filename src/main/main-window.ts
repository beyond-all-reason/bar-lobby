// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app, BrowserWindow, nativeImage, screen } from "electron";
import path from "path";
import { settingsService } from "./services/settings.service";
import { logger } from "./utils/logger";
import icon from "@main/resources/icon.png";
import { purgeLogFiles } from "@main/services/log.service";
import { typedWebContents, ipcMain } from "@main/typed-ipc";
import { gameAPI } from "@main/game/game";
import contentService from "@main/services/content.service";

const UI_SCALE_MIN = 0.5;
const UI_SCALE_MAX = 3;
const UI_SCALE_STEP = 0.1;

const log = logger("main-window");

export function createWindow() {
    const settings = settingsService.getSettings();
    log.info("Creating main window with settings: ", settings);

    function displayAspectRatio(displayIndex: number) {
        const display = screen.getAllDisplays()[displayIndex] ?? screen.getPrimaryDisplay();

        return display.bounds.width / display.bounds.height;
    }

    function getWindowSize(windowedHeight: number, displayIndex = settingsService.getSettings().displayIndex) {
        return {
            width: Math.round(windowedHeight * displayAspectRatio(displayIndex)),
            height: windowedHeight,
        };
    }

    const mainWindow = new BrowserWindow({
        title: "Beyond All Reason",
        icon: nativeImage.createFromDataURL(icon),
        resizable: true,
        center: true,
        frame: false,
        show: false,
        autoHideMenuBar: true,
        ...getWindowSize(settings.size),
        minWidth: 640,
        minHeight: 360,
        backgroundColor: "#000000",
        webPreferences: {
            preload: path.join(__dirname, "../build/preload.js"),
            zoomFactor: 1,
            spellcheck: false,
            autoplayPolicy: "no-user-gesture-required",
        },
    });

    const webContents = typedWebContents(mainWindow.webContents);

    // Disable zoom shortcuts
    webContents.on("before-input-event", (event, input) => {
        // Chromium's own zoom is bypassed so the scale stays a persisted setting.
        if (input.type !== "keyDown" || !(input.control || input.meta)) return;
        const delta = input.key === "+" || input.key === "=" ? UI_SCALE_STEP : input.key === "-" ? -UI_SCALE_STEP : input.key === "0" ? 0 : null;
        if (delta === null) return;

        event.preventDefault();
        nudgeUiScale(delta);
    });

    // The setting is an absolute interface scale, matching what the OS calls its
    // scaling percentage, so Chromium's own OS-derived scaling has to be divided out.
    function osScale() {
        return screen.getDisplayMatching(mainWindow.getBounds()).scaleFactor || 1;
    }

    function applyScale(uiScale: number | null) {
        const os = osScale();
        const target = uiScale ?? os;
        webContents.setZoomFactor(Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, target)) / os);
    }

    function updateZoom() {
        applyScale(settingsService.getSettings().uiScale);
    }

    async function nudgeUiScale(delta: number) {
        const current = settingsService.getSettings().uiScale ?? osScale();
        const next = delta === 0 ? null : Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Math.round((current + delta) * 100) / 100));
        await settingsService.updateSettings({ uiScale: next });
        updateZoom();
    }

    process.env.MAIN_WINDOW_ID = mainWindow.id.toString();

    mainWindow.once("ready-to-show", () => {
        // Open the DevTools.
        if (process.env.NODE_ENV === "development") {
            log.debug(`NODE_ENV is development, opening dev tools`);
            webContents.openDevTools();
        }
        mainWindow.setMenuBarVisibility(false);
        mainWindow.center();
        // Note: `fullscreen: true` conflicts with `show: false`, so we apply fullscreen here.
        if (settings.fullscreen) {
            mainWindow.setFullScreen(true);
        }
        updateZoom();
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
    });
    ipcMain.handle("mainWindow:setSize", (_event, size: number) => {
        if (!mainWindow.isFullScreen() && !mainWindow.isMaximized()) {
            const { width, height } = getWindowSize(size);
            mainWindow.setSize(width, height);
        }
    });
    ipcMain.handle("mainWindow:flashFrame", (_event, flag: boolean) => {
        mainWindow.flashFrame(flag);
    });
    ipcMain.handle("mainWindow:setUiScale", (_event, scale: number | null) => applyScale(scale));
    ipcMain.handle("mainWindow:getOsScale", () => osScale());
    ipcMain.handle("mainWindow:getDisplays", () =>
        screen.getAllDisplays().map((display, index) => ({
            index,
            scaleFactor: display.scaleFactor || 1,
            aspectRatio: display.bounds.width / display.bounds.height,
            // Work area excludes the taskbar, so a window sized to it stays reachable.
            workArea: { width: display.workAreaSize.width, height: display.workAreaSize.height },
        }))
    );
    ipcMain.handle("mainWindow:minimize", () => mainWindow.minimize());
    ipcMain.handle("mainWindow:isFullscreen", () => mainWindow.isFullScreen());

    // Get download progress updates to update the dock/taskbar
    contentService.registerProgressHandler(mainWindow);

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
