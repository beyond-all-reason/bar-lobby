// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app, BrowserWindow, nativeImage, screen } from "electron";
import path from "path";
import url from "url";
import { settingsService } from "./services/settings.service";
import { logger } from "./utils/logger";
import icon from "@main/resources/icon.png";
import { MIN_WINDOW_SIZE, UI_SCALE_MAX, UI_SCALE_MIN, UI_SCALE_STEP } from "@main/config/window";
import { purgeLogFiles } from "@main/services/log.service";
import { typedWebContents, ipcMain } from "@main/typed-ipc";
import { gameAPI } from "@main/game/game";
import contentService from "@main/services/content.service";
import { suppressBrowserBehaviours } from "@main/browser-behaviours";

const log = logger("main-window");

export function createWindow() {
    const settings = settingsService.getSettings();
    log.info("Creating main window with settings: ", settings);

    function scaleRange() {
        return { min: UI_SCALE_MIN, max: UI_SCALE_MAX, os: osScale() };
    }

    const mainWindow = new BrowserWindow({
        title: "Beyond All Reason",
        icon: nativeImage.createFromDataURL(icon),
        resizable: true,
        center: true,
        frame: false,
        show: false,
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

    // Stored by the renderer, which writes the whole settings object and would otherwise
    // overwrite a value set behind its back.
    function nudgeUiScale(delta: number) {
        const { min, max } = scaleRange();
        const current = settingsService.getSettings().uiScale ?? osScale();
        const next = delta === 0 ? null : Math.min(max, Math.max(min, Math.round((current + delta) * 100) / 100));

        webContents.send("mainWindow:uiScaleNudged", next);
    }

    // Resize fires continuously while dragging, hence the trailing timer.
    let zoomUpdate: NodeJS.Timeout | undefined;
    function scheduleZoomUpdate() {
        clearTimeout(zoomUpdate);
        zoomUpdate = setTimeout(() => {
            updateZoom();
            webContents.send("mainWindow:scaleRangeChanged", scaleRange());
            reportWindowState();
        }, 100);
    }

    // Electron reads sizes back a few pixels off, even unresized, and saving that would creep the setting.
    let knownSize = [0, 0];

    function rememberSize() {
        knownSize = mainWindow.getSize();
    }

    function resizedByUser(width: number, height: number) {
        return Math.abs(width - knownSize[0]) > 2 || Math.abs(height - knownSize[1]) > 2;
    }

    // will-move fires only for drags: not our setBounds, not OS moves, and not on Linux, where Wayland hides position.
    let draggedByUser = false;

    function draggedToDisplayId() {
        if (!draggedByUser) return undefined;

        draggedByUser = false;

        return screen.getDisplayMatching(mainWindow.getBounds()).id;
    }

    // No size while fullscreen or maximised, since the remembered one is where to return to.
    function reportWindowState() {
        const maximized = mainWindow.isMaximized();
        const [width, height] = mainWindow.getSize();
        const reportSize = !maximized && !mainWindow.isFullScreen() && resizedByUser(width, height);
        if (reportSize) knownSize = [width, height];

        webContents.send("mainWindow:windowStateChanged", { maximized, size: reportSize ? { width, height } : null, displayId: draggedToDisplayId() });
    }

    mainWindow.on("will-move", () => (draggedByUser = true));
    mainWindow.on("move", scheduleZoomUpdate);
    mainWindow.on("resize", scheduleZoomUpdate);
    mainWindow.on("maximize", scheduleZoomUpdate);
    mainWindow.on("unmaximize", scheduleZoomUpdate);
    mainWindow.on("enter-full-screen", scheduleZoomUpdate);
    mainWindow.on("leave-full-screen", scheduleZoomUpdate);
    mainWindow.on("closed", () => clearTimeout(zoomUpdate));

    // Sized from the setting, not the window, so it survives leaving fullscreen and isn't trimmed to fit.
    function centreOn(display: Electron.Display) {
        const { windowWidth, windowHeight } = settingsService.getSettings();
        const width = Math.max(windowWidth, MIN_WINDOW_SIZE.width);
        const height = Math.max(windowHeight, MIN_WINDOW_SIZE.height);
        const { workArea } = display;
        // A size bigger than the display still keeps its top left on screen, where the frameless window's navbar and drag area are.
        const bounds = {
            width,
            height,
            x: Math.max(workArea.x, Math.round(workArea.x + (workArea.width - width) / 2)),
            y: Math.max(workArea.y, Math.round(workArea.y + (workArea.height - height) / 2)),
        };

        // Windows rescales a window that lands on a monitor with a different scale, so the size is applied again once it is there.
        mainWindow.setBounds(bounds);
        mainWindow.setBounds(bounds);
        rememberSize();
    }

    process.env.MAIN_WINDOW_ID = mainWindow.id.toString();

    mainWindow.once("ready-to-show", () => {
        // Open the DevTools.
        if (process.env.NODE_ENV === "development" && settings.devMode) {
            log.debug(`NODE_ENV is development, opening dev tools`);
            webContents.openDevTools();
        }
        centreOn(screen.getAllDisplays().find((display) => display.id === settings.displayId) ?? screen.getPrimaryDisplay());
        // Note: `fullscreen: true` conflicts with `show: false`, so we apply fullscreen here.
        if (settings.fullscreen) {
            mainWindow.setFullScreen(true);
        } else if (settings.maximized) {
            mainWindow.maximize();
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

    const appUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL ?? url.pathToFileURL(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)).href;
    suppressBrowserBehaviours(mainWindow, appUrl, () => settingsService.getSettings().devMode);
    mainWindow.loadURL(appUrl);

    mainWindow.on("restore", () => mainWindow.flashFrame(false));

    app.on("browser-window-focus", () => mainWindow.flashFrame(false));

    // Register IPC handlers for the main window
    ipcMain.handle("mainWindow:setFullscreen", (_event, flag: boolean) => {
        mainWindow.setFullScreen(flag);
    });
    ipcMain.handle("mainWindow:setMaximized", (_event, flag: boolean) => {
        if (flag === mainWindow.isMaximized()) return;
        if (!flag) {
            mainWindow.unmaximize();
            return;
        }

        if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
        mainWindow.maximize();
    });
    ipcMain.handle("mainWindow:setSize", (_event, width: number, height: number) => {
        // Their own settings are written alongside the size and applied first; leaving those
        // modes here as well undid a revert back to fullscreen.
        if (mainWindow.isFullScreen() || mainWindow.isMaximized()) return;

        const target = { width: Math.max(width, MIN_WINDOW_SIZE.width), height: Math.max(height, MIN_WINDOW_SIZE.height) };
        const [currentWidth, currentHeight] = mainWindow.getSize();
        // Arrives again for a size the window already has, and re-centring would yank a drag.
        if (target.width === currentWidth && target.height === currentHeight) return;

        mainWindow.setSize(target.width, target.height);
        mainWindow.center();
        rememberSize();
        updateZoom();
    });
    ipcMain.handle("mainWindow:setDisplay", (_event, id: number) => {
        const display = screen.getAllDisplays().find((display) => display.id === id);
        if (!display) return;

        // Fullscreen and maximised are tied to the display they were entered on.
        const wasFullScreen = mainWindow.isFullScreen();
        const wasMaximized = mainWindow.isMaximized();
        if (wasFullScreen) mainWindow.setFullScreen(false);
        if (wasMaximized) mainWindow.unmaximize();

        centreOn(display);

        if (wasFullScreen) mainWindow.setFullScreen(true);
        else if (wasMaximized) mainWindow.maximize();

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
            id: display.id,
            // The monitor's model name on Windows; may be blank elsewhere.
            label: display.label,
            primary: display.id === screen.getPrimaryDisplay().id,
            current: display.id === screen.getDisplayMatching(mainWindow.getBounds()).id,
            scaleFactor: display.scaleFactor || 1,
            workArea: { width: display.workAreaSize.width, height: display.workAreaSize.height },
            // workArea has the taskbar removed, so it is the wrong shape for an aspect ratio.
            size: { width: display.size.width, height: display.size.height },
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
