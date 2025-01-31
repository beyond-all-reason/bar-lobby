import { app, BrowserWindow, ipcMain, nativeImage } from "electron";
import path from "path";
import { settingsService } from "./services/settings.service";
import { logger } from "./utils/logger";
import { replayContentAPI } from "@main/content/replays/replay-content";
import icon from "@main/resources/icon.png";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const log = logger("main-window");

export function createWindow() {
    const settings = settingsService.getSettings();
    log.info("Creating main window with settings: ", settings);

    const width = 1920;
    const height = 1080;

    const mainWindow = new BrowserWindow({
        title: "Beyond All Reason",
        fullscreen: settings?.fullscreen || false,
        icon: nativeImage.createFromDataURL(icon),
        width: width,
        height: height,
        minWidth: width,
        minHeight: height,
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

    function setZoomFactor(isFullScreen: boolean) {
        const zoomFactor = isFullScreen ? mainWindow.getContentSize()[1] / height : 1.0;
        console.log("Window size: ", mainWindow.getContentSize());
        console.log("Zoom factor: ", zoomFactor);
        mainWindow.webContents.zoomFactor = zoomFactor;
    }
    setZoomFactor(settings.fullscreen);

    mainWindow.on("enter-full-screen", () => {
        console.log("Enter full screen event");
        setZoomFactor(true);
    });

    mainWindow.on("leave-full-screen", () => {
        console.log("Leave full screen event");
        setZoomFactor(false);
    });

    // mainWindow.setSize(width, height);
    // mainWindow.setAspectRatio(16 / 9);

    // function setDisplay(display: Electron.Display) {
    //     // const { x, y, width, height } = display.bounds;
    //     // mainWindow.setPosition(x, y);
    //     mainWindow.setPosition(display.bounds.x, display.bounds.y);
    //     mainWindow.setSize(width, height);
    //     mainWindow.center();
    //     // mainWindow.maximize();
    // }
    // setDisplay(screen.getAllDisplays()[settings.displayIndex]);

    process.env.MAIN_WINDOW_ID = mainWindow.id.toString();

    log.debug("Settings: ", settings);

    mainWindow.once("ready-to-show", () => {
        // Open the DevTools.
        if (process.env.NODE_ENV === "development") {
            log.debug(`NODE_ENV is development, opening dev tools`);
            mainWindow.webContents.openDevTools();
        }

        mainWindow.setMenuBarVisibility(false);
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.webContents.on("render-process-gone", (event, details) => {
        console.error(details);
    });

    // Disable new window creation
    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: "deny" };
    });

    // and load the index.html of the app.
    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    } else {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    }

    mainWindow.on("restore", () => mainWindow.flashFrame(false));

    app.on("browser-window-focus", () => mainWindow.flashFrame(false));
    app.on("second-instance", (_event, commandLine) => {
        log.info("Second Instance opening with command line: " + commandLine);
        focusWindows();
        openFile(commandLine[commandLine.length - 1]);
    });
    app.on("open-file", (_, path) => {
        log.info("Mac OS opening file: " + path);
        focusWindows();
        openFile(path);
    });

    function focusWindows() {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }

    function openFile(path: string) {
        if (!path.endsWith(".sdfz")) {
            return;
        }
        replayContentAPI.copyParseAndLaunchReplay(path);
    }

    //TODO add an IPC handler for changing display via the settings

    // Register IPC handlers for the main window
    ipcMain.handle("mainWindow:setFullscreen", (_event, flag: boolean) => {
        mainWindow.setFullScreen(flag);
    });
    ipcMain.handle("mainWindow:toggleFullscreen", () => mainWindow.setFullScreen(!mainWindow.isFullScreen()));
    ipcMain.handle("mainWindow:flashFrame", (_event, flag: boolean) => {
        mainWindow.flashFrame(flag);
    });
    /////////////////////////////////////////////

    // Subscribe to game events
    mainWindow.webContents.ipc.handle("game:launched", () => {
        log.info("Game launched");
    });

    return mainWindow;
}
