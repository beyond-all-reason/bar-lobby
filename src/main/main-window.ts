import { app, BrowserWindow, screen, shell } from "electron";
import path from "path";
import { watch } from "vue";

import type { StoreAPI } from "$/api/store";
import type { SettingsType } from "$/model/settings";

declare const __static: string;

export class MainWindow {
    public window: BrowserWindow;

    protected settings: StoreAPI<SettingsType>;

    constructor(settings: StoreAPI<SettingsType>) {
        this.settings = settings;

        this.window = new BrowserWindow({
            title: "Beyond All Reason",
            fullscreen: this.settings.model.fullscreen.value,
            frame: true,
            show: false,
            //icon: path.join(__static, "icon.png"),
            minWidth: 1440,
            minHeight: 900,
            darkTheme: true,
            paintWhenInitiallyHidden: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                nodeIntegrationInSubFrames: true,
                nodeIntegrationInWorker: true,
                webSecurity: false,
                backgroundThrottling: false,
            },
        });

        this.window.once("ready-to-show", () => this.show());

        this.window.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: "deny" };
        });

        this.window.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
            callback({ requestHeaders: { Origin: "*", ...details.requestHeaders } });
        });

        this.window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
            const obj = { responseHeaders: { ...details.responseHeaders } };
            if (!obj.responseHeaders["Access-Control-Allow-Origin"] && !obj.responseHeaders["access-control-allow-origin"]) {
                obj.responseHeaders["Access-Control-Allow-Origin"] = ["*"];
            }
            callback(obj);
        });

        watch(this.settings.model.displayIndex, (displayIndex) => this.setDisplay(displayIndex));
        watch(this.settings.model.fullscreen, (fullscreen) => {
            this.window.setFullScreen(fullscreen);
            this.window.maximize();
        });

        this.init();
    }

    public async init() {
        if (app.isPackaged && process.env.NODE_ENV !== "development") {
            // await autoUpdater.checkForUpdatesAndNotify({
            //     title: "Beyond All Reason",
            //     body: `Updated to version ${app.getVersion()}`,
            // });
            this.window.loadFile(path.join(__dirname, "../renderer/index.html"));
        } else {
            if (process.env.ELECTRON_RENDERER_URL) {
                this.window.loadURL(process.env.ELECTRON_RENDERER_URL);
            } else {
                console.error("ELECTRON_RENDERER_URL is undefined");
            }
            this.window.webContents.openDevTools();
        }
    }

    public show() {
        this.setDisplay(this.settings.model.displayIndex.value);

        this.window.setMenuBarVisibility(false);

        this.window.show();
        this.window.focus();
    }

    public setDisplay(displayIndex: number) {
        const display = screen.getAllDisplays()[displayIndex];
        if (display) {
            const { x, y, width, height } = display.bounds;
            this.window.setPosition(x, y);
            this.window.setSize(width, height);
            this.window.maximize();
            this.settings.model.displayIndex.value = displayIndex;
        }
    }
}
