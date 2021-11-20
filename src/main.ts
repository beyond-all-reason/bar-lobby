import * as fs from "fs";
import * as path from "path";
import { app, App, ipcMain, protocol, screen } from "electron";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import { IpcMainInvokeEvent } from "electron/main";

import { SettingsAPI } from "@/api/settings";
import { MainWindow } from "@/main-window";
import { API, IpcHandlers } from "@/model/api";

export class Application {
    protected app: App;
    protected mainWindow!: MainWindow;
    protected settingsAPI: SettingsAPI = new SettingsAPI();

    constructor(app: App) {
        this.app = app;

        protocol.registerSchemesAsPrivileged([{
            scheme: "app",
            privileges: {
                secure: true,
                standard: true,
                stream: true
            }
        }]);

        this.app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");

        if (process.env.NODE_ENV !== "production") {
            if (process.platform === "win32") {
                process.on("message", (data) => {
                    if (data === "graceful-exit") {
                        app.quit();
                    }
                });
            } else {
                process.on("SIGTERM", () => {
                    app.quit();
                });
            }
        }
        
        this.app.on("ready", () => this.onReady());
        this.app.on("activate", () => this.onActivate());
        this.app.on("window-all-closed", () => this.onWindowAllClosed());

        this.setupHandlers();
    }

    protected async onReady() {
        if (process.env.NODE_ENV !== "production" && !process.env.IS_TEST) {
            try {
                await installExtension(VUEJS3_DEVTOOLS);
            } catch (e: any) {
                console.error("Vue Devtools failed to install:", e.toString());
            }
        }

        if (!this.mainWindow) {
            this.setupMainWindow();
        }
    }

    protected async onActivate() {
        if (!this.mainWindow) {
            this.setupMainWindow();
        }
    }

    protected setupMainWindow() {
        this.mainWindow = new MainWindow({
            displayIndex: this.settingsAPI.getSettings().displayIndex
        });

        this.settingsAPI.onSettingChanged("displayIndex").add((displayIndex) => {
            this.mainWindow.setDisplay(displayIndex);
        });
    }

    protected async onWindowAllClosed() {
        if (process.platform !== "darwin") {
            this.app.quit();
        }
    }

    protected setupHandlers() {
        this.addHandler("getHardwareInfo", async (event) => {
            const allDisplays = screen.getAllDisplays();

            return {
                numOfDisplays: allDisplays.length,
                currentDisplayIndex: allDisplays.indexOf(screen.getDisplayNearestPoint(this.mainWindow.window.getBounds()))
            };
        });

        this.addHandler("getRandomBackground", async (event) => {
            const backgrounds = await fs.promises.readdir(path.join(__static, "backgrounds"));
            const background = backgrounds[Math.floor(Math.random() * backgrounds.length)];
            return `backgrounds/${background}`;
        });
    }

    protected addHandler<K extends keyof IpcHandlers, L extends API[K] = API[K]>(key: K, handler: (event: IpcMainInvokeEvent, args: Parameters<L>) => ReturnType<L>) {
        ipcMain.handle(key, handler);
    }
}

new Application(app);