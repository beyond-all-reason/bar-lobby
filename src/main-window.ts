import * as path from "path";
import { BrowserWindow, screen, shell } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";

declare const __static: string;

export interface MainWindowConfig {
    fullscreen: boolean;
    displayIndex: number;
}

export const defaultMainWindowConfig: MainWindowConfig = {
    fullscreen: false,
    displayIndex: 0
};

export class MainWindow {
    public window: BrowserWindow;
    
    protected config: MainWindowConfig;

    constructor(config?: Partial<MainWindowConfig>) {
        this.config = Object.assign({}, defaultMainWindowConfig, config);

        this.window = new BrowserWindow({
            title: "BAR Lobby",
            fullscreen: this.config.fullscreen,
            frame: !this.config.fullscreen,
            resizable: true,
            show: false,
            icon: path.join(__static, "icon.png"),
            minWidth: 1300,
            minHeight: 800,
            darkTheme: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "preload.js")
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

    public setDisplay(index: number) {
        const display = screen.getAllDisplays()[index];
        if (display) {
            const { x, y, width, height } = display.bounds;
            this.window.setPosition(x, y);
            this.window.setSize(width, height);
        }
    }

    protected onReadyToShow() {
        this.setDisplay(this.config.displayIndex);

        if (!this.config.fullscreen) {
            this.window.maximize();
        }

        //this.window.setResizable(false);

        this.window.setMenuBarVisibility(false);
        
        this.window.show();
    }
}