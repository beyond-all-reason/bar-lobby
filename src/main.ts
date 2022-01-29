import { app, App, ipcMain, protocol, screen } from "electron";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import unhandled from "electron-unhandled";

import { MainWindow } from "@/main-window";
import { settingsSchema, SettingsType } from "@/model/settings";
import { StoreAPI } from "@/api/store";
import { Info } from "@/model/info";
import { CacheAPI } from "@/api/cache";

export class Application {
    protected app: App;
    protected mainWindow?: MainWindow;
    protected settings?: StoreAPI<SettingsType>;
    protected cache?: CacheAPI;

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
            this.init();
        }
    }

    protected async onActivate() {
        if (!this.mainWindow) {
            this.init();
        }
    }

    protected async init() {
        this.settings = await new StoreAPI<SettingsType>("settings", settingsSchema).init();

        this.cache = await new CacheAPI(this.app.getPath("userData"), this.settings.model.dataDir).init();

        this.mainWindow = new MainWindow(this.settings);

        this.setupHandlers();
    }

    protected async onWindowAllClosed() {
        if (process.platform !== "darwin") {
            this.app.quit();
        }
    }

    protected setupHandlers() {
        // TODO: refactor this info into session store api?
        ipcMain.handle("getInfo", async (event) => {
            const userDataPath = this.app.getPath("userData");

            const displayIds = screen.getAllDisplays().map(display => display.id);
            const currentDisplayId = screen.getDisplayNearestPoint(this.mainWindow!.window.getBounds()).id;

            const info: Info = {
                lobby: {
                    name: this.app.getName(),
                    version: this.app.getVersion(),
                    hash: "123"
                },
                userDataPath: userDataPath,
                hardware: {
                    numOfDisplays: displayIds.length,
                    currentDisplayIndex: displayIds.indexOf(currentDisplayId)
                }
            };

            return info;
        });
    }
}

unhandled();

new Application(app);