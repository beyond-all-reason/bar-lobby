import type { App } from "electron";
import { app, ipcMain, protocol, screen } from "electron";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import unhandled from "electron-unhandled";
import { MainWindow } from "@/main-window";
import type { SettingsType } from "@/model/settings";
import { settingsSchema } from "@/model/settings";
import { StoreAPI } from "@/api/store";
import type { Info } from "@/model/info";

const isProd = process.env.NODE_ENV === "production";
export class Application {
    protected app: App;
    protected mainWindow?: MainWindow;
    protected settings?: StoreAPI<SettingsType>;

    constructor(app: App) {
        this.app = app;

        protocol.registerSchemesAsPrivileged([{
            scheme: "bar",
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
        if (!isProd && !process.env.IS_TEST) {
            try {
                await installExtension(VUEJS3_DEVTOOLS);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            const appPath = this.app.getAppPath();

            const displayIds = screen.getAllDisplays().map(display => display.id);
            const currentDisplayId = screen.getDisplayNearestPoint(this.mainWindow!.window.getBounds()).id;

            const info: Info = {
                lobby: {
                    name: this.app.getName(),
                    version: this.app.getVersion(),
                    hash: "123" // TODO: generate and inject checksum of app build in CI pipeline
                },
                userDataPath,
                appPath,
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