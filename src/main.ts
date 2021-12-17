import * as path from "path";
import * as fs from "fs";
import { app, App, ipcMain, protocol, screen } from "electron";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import unhandled from "electron-unhandled";

import { MainWindow } from "@/main-window";
import { settingsSchema, SettingsType } from "@/model/settings";
import Ajv from "ajv";

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
        const userDataPath = path.join(this.app.getPath("userData"), "store");
        const settingsPath = path.join(userDataPath, "settings.json");

        let model = {} as SettingsType;

        if (fs.existsSync(settingsPath)) {
            const fileStr = await fs.promises.readFile(settingsPath, "utf8");
            model = JSON.parse(fileStr);
        }

        const ajv = new Ajv({ coerceTypes: true, useDefaults: true });
        const validator = ajv.compile(settingsSchema);
        validator(model);

        if (!fs.existsSync(settingsPath)) {
            await fs.promises.mkdir(userDataPath);
            await fs.promises.writeFile(settingsPath, JSON.stringify(model, null, 4));
        }

        this.settings = model;

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
        ipcMain.handle("ready", () => {
            this.mainWindow.show();
        });

        ipcMain.handle("getInfo", async (event) => {
            const userDataPath = path.join(this.app.getPath("userData"), "store");
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath);
            }

            const displayIds = screen.getAllDisplays().map(display => display.id);
            const currentDisplayId = screen.getDisplayNearestPoint(this.mainWindow.window.getBounds()).id;

            return {
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
        });
    }
}

unhandled();

new Application(app);