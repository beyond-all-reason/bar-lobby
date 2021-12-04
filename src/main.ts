import * as path from "path";
import * as fs from "fs";
import { app, App, ipcMain, protocol, screen } from "electron";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";

import { MainWindow } from "@/main-window";
import { SettingsType } from "@/model/settings";

export class Application {
    protected app: App;
    protected mainWindow!: MainWindow;
    protected settings!: SettingsType;

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

    protected async setupMainWindow() {
        const settingsStr = await fs.promises.readFile(path.join(this.app.getPath("userData"), "settings.json"), "utf8");
        this.settings = JSON.parse(settingsStr);

        this.mainWindow = new MainWindow({
            displayIndex: this.settings.displayIndex
        });
    }

    protected async onWindowAllClosed() {
        if (process.platform !== "darwin") {
            this.app.quit();
        }
    }

    protected setupHandlers() {
        ipcMain.handle("getInfo", async (event) => {
            const displayIds = screen.getAllDisplays().map(display => display.id);
            const currentDisplayId = screen.getDisplayNearestPoint(this.mainWindow.window.getBounds()).id;

            return {
                lobby: {
                    name: this.app.getName(),
                    version: this.app.getVersion(),
                    hash: "123"
                },
                settingsPath: path.join(this.app.getPath("userData"), "settings.json"),
                hardware: {
                    numOfDisplays: displayIds.length,
                    currentDisplayIndex: displayIds.indexOf(currentDisplayId)
                }
            };
        });
    }
}

new Application(app);