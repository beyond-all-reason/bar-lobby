import * as path from "path";
import { app, BrowserWindow, screen, shell } from "electron";
import { PreloadConfig } from "@/model/preload-config";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";

declare const __static: string;

export interface MainWindowConfig {
    fullscreen?: boolean;
}

export const defaultMainWindowConfig: Partial<MainWindowConfig> = {
    fullscreen: true
};

export class MainWindow {
    protected config: MainWindowConfig;
    protected window: BrowserWindow;

    constructor(config: MainWindowConfig) {
        this.config = config;

        const defaultPreloadConfig: Partial<PreloadConfig> = {
            settingsFilePath: path.join(app.getPath("userData"), "settings.json")
        };

        this.window = new BrowserWindow({
            title: "BAR Lobby",
            fullscreen: this.config.fullscreen,
            frame: !this.config.fullscreen,
            resizable: !this.config.fullscreen,
            show: false,
            icon: path.join(__static, "icon.png"),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "preload.js"),
                additionalArguments: [JSON.stringify(defaultPreloadConfig)]
            }
        });

        this.window.once("ready-to-show", () => this.onReadyToShow());
        
        this.window.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: "deny" };
        });

        this.init();
    }

    public async init() {
        if (process.env.WEBPACK_DEV_SERVER_URL) {
            await this.window.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
            if (!process.env.IS_TEST) this.window.webContents.openDevTools();
        } else {
            createProtocol("app");
            this.window.loadURL("app://./index.html");
        }
    }

    protected onReadyToShow() {
        const chosenDisplay = 1;
        const { x, y } = screen.getAllDisplays()[chosenDisplay].bounds;
        this.window.setPosition(x, y);

        if (!this.config.fullscreen) {
            this.window.maximize();
        }

        this.window.setMenuBarVisibility(false);
        
        this.window.show();
    }
}