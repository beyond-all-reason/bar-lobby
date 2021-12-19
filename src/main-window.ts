import * as path from "path";
import { BrowserWindow, screen, shell } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import { autoUpdater } from "electron-updater";
import { SettingsType } from "@/model/settings";
import { StoreAPI } from "@/api/store";
import { watch } from "vue";

declare const __static: string;

export class MainWindow {
    public window: BrowserWindow;

    protected settings: StoreAPI<SettingsType>;

    constructor(settings: StoreAPI<SettingsType>) {
        this.settings = settings;

        this.window = new BrowserWindow({
            title: "BAR Lobby",
            fullscreen: this.settings.model.fullscreen.value,
            frame: true,
            show: false,
            icon: path.join(__static, "icon.png"),
            minWidth: 1440,
            minHeight: 900,
            darkTheme: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                nodeIntegrationInSubFrames: true,
                nodeIntegrationInWorker: true
            }
        });

        this.window.once("ready-to-show", () => this.show());
        
        this.window.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: "deny" };
        });

        watch(this.settings.model.displayIndex, (displayIndex) => this.setDisplay(displayIndex));
        watch(this.settings.model.fullscreen, (fullscreen) => {
            this.window.setFullScreen(fullscreen);
            this.window.maximize();
        });

        this.init();
    }

    public async init() {
        if (process.env.WEBPACK_DEV_SERVER_URL) {
            await this.window.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
            if (!process.env.IS_TEST) this.window.webContents.openDevTools();
        } else {
            createProtocol("bar");
            this.window.loadURL("bar://./index.html");
            if (process.env.AUTO_UPDATE) {
                autoUpdater.checkForUpdatesAndNotify();
            }
        }
    }

    public show() {
        this.setDisplay(this.settings.model.displayIndex.value);

        this.window.setMenuBarVisibility(false);
        
        this.window.show();
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