// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app, BrowserWindow, nativeImage, screen } from "electron";
import path from "path";
import { settingsService } from "./services/settings.service";
import { logger } from "./utils/logger";
import icon from "@main/resources/icon.png";
import { MAX_VIEWPORT, MIN_VIEWPORT, MIN_WINDOW_SIZE, UI_SCALE_STEP, clampUiScale } from "@main/config/window";
import { purgeLogFiles } from "@main/services/log.service";
import { typedWebContents, ipcMain } from "@main/typed-ipc";
import { gameAPI } from "@main/game/game";
import contentService from "@main/services/content.service";

const log = logger("main-window");

export function createWindow() {
    const settings = settingsService.getSettings();
    log.info("Creating main window with settings: ", settings);

    // Zoom maps device independent pixels to CSS pixels, so it is what decides whether the
    // layout sees a viewport it was built for.
    function zoomRangeForWindow() {
        const [width, height] = mainWindow.getContentSize();
        const smallest = Math.max(width / MAX_VIEWPORT.width, height / MAX_VIEWPORT.height);
        const largest = Math.min(width / MIN_VIEWPORT.width, height / MIN_VIEWPORT.height);

        // A window outside the supportable range cannot satisfy both ends; keeping the
        // viewport under the maximum matters more, since that is what overscales the UI.
        return { smallest, largest: Math.max(smallest, largest) };
    }

    // Expressed as interface scale rather than zoom, so it can bound the settings control
    // directly instead of the applied value being quietly corrected afterwards.
    function scaleRange() {
        const os = osScale();
        const { smallest, largest } = zoomRangeForWindow();

        return { min: clampUiScale(smallest * os), max: clampUiScale(largest * os), os };
    }

    const mainWindow = new BrowserWindow({
        title: "Beyond All Reason",
        icon: nativeImage.createFromDataURL(icon),
        resizable: true,
        center: true,
        frame: false,
        show: false,
        autoHideMenuBar: true,
        width: settings.windowWidth,
        height: settings.windowHeight,
        minWidth: MIN_WINDOW_SIZE.width,
        minHeight: MIN_WINDOW_SIZE.height,
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
        const { min, max, os } = scaleRange();

        webContents.setZoomFactor(Math.min(max, Math.max(min, uiScale ?? os)) / os);
    }

    function updateZoom() {
        applyScale(settingsService.getSettings().uiScale);
    }

    async function nudgeUiScale(delta: number) {
        const { min, max } = scaleRange();
        const current = settingsService.getSettings().uiScale ?? osScale();
        const next = delta === 0 ? null : Math.min(max, Math.max(min, Math.round((current + delta) * 100) / 100));

        try {
            await settingsService.updateSettings({ uiScale: next });
        } catch (err) {
            log.error("Failed to persist the interface scale", err);
        }
        updateZoom();
    }

    // The permitted zoom is derived from the window size, so every geometry change has to
    // recompute it. Resize fires continuously while dragging, hence the trailing timer.
    let zoomUpdate: NodeJS.Timeout | undefined;
    function scheduleZoomUpdate() {
        clearTimeout(zoomUpdate);
        zoomUpdate = setTimeout(() => {
            updateZoom();
            webContents.send("mainWindow:scaleRangeChanged", scaleRange());
        }, 100);
    }

    mainWindow.on("resize", scheduleZoomUpdate);
    mainWindow.on("enter-full-screen", scheduleZoomUpdate);
    mainWindow.on("leave-full-screen", scheduleZoomUpdate);
    mainWindow.on("closed", () => clearTimeout(zoomUpdate));

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
    ipcMain.handle("mainWindow:setSize", (_event, width: number, height: number) => {
        if (mainWindow.isFullScreen() || mainWindow.isMaximized()) return;

        mainWindow.setSize(Math.max(width, MIN_WINDOW_SIZE.width), Math.max(height, MIN_WINDOW_SIZE.height));
        mainWindow.center();
        updateZoom();
    });
    ipcMain.handle("mainWindow:flashFrame", (_event, flag: boolean) => {
        mainWindow.flashFrame(flag);
    });
    ipcMain.handle("mainWindow:setUiScale", (_event, scale: number | null) => applyScale(scale));
    ipcMain.handle("mainWindow:getScaleRange", () => scaleRange());
    ipcMain.handle("mainWindow:getDisplays", () =>
        screen.getAllDisplays().map((display, index) => ({
            index,
            scaleFactor: display.scaleFactor || 1,
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
