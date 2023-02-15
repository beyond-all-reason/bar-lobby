import { App, safeStorage } from "electron";
import { app, ipcMain, protocol, screen } from "electron";
import unhandled from "electron-unhandled";
import { autoUpdater } from "electron-updater";
import envPaths from "env-paths";
import * as path from "path";

import { StoreAPI } from "@/api/store";
import { MainWindow } from "@/main-window";
import type { Info } from "$/model/info";
import type { SettingsType } from "$/model/settings";
import { settingsSchema } from "$/model/settings";

export class Application {
    protected app: App;
    protected mainWindow?: MainWindow;
    protected settings?: StoreAPI<SettingsType>;
    protected initialised = false;

    constructor(app: App) {
        this.app = app;

        this.app.setName("Beyond All Reason");

        process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

        protocol.registerSchemesAsPrivileged([
            {
                scheme: "bar",
                privileges: {
                    secure: true,
                    standard: true,
                    stream: true,
                },
            },
        ]);

        this.app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");
        this.app.commandLine.appendSwitch("in-process-gpu");
        this.app.commandLine.appendSwitch("disable-direct-composition");

        // commented out until we have a gameid for bar via steamworks
        // this.setupSteam();

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
        this.app.on("window-all-closed", () => this.app.quit());
    }

    protected async onReady() {
        if (process.env.NODE_ENV === "development") {
            try {
                // await installExtension("nhdogjmejiglipccpnnnanhbledajbpd"); // commenting out for now because seems to sometimes not work and spam errors in console
            } catch (err) {
                console.error("Vue Devtools failed to install:", err?.toString());
            }
        } else if (app.isPackaged && process.env.NODE_ENV !== "development") {
            const updateInfo = autoUpdater.checkForUpdatesAndNotify();
            console.log(updateInfo);
        }

        if (!this.initialised) {
            this.initialised = true;
            await this.init();
        }
    }

    protected async init() {
        const info = this.getInfo();
        const settingsFilePath = path.join(info.configPath, "settings.json");
        this.settings = await new StoreAPI<SettingsType>(settingsFilePath, settingsSchema).init();

        this.mainWindow = new MainWindow(this.settings);

        this.setupHandlers();
    }

    protected setupHandlers() {
        ipcMain.handle("getInfo", async () => {
            return this.getInfo();
        });

        ipcMain.handle("highlightTaskbarIcon", (_, shouldHighlight: boolean) => {
            this.mainWindow?.window.flashFrame(shouldHighlight);
        });

        ipcMain.handle("encryptString", async (event, str: string) => {
            if (safeStorage.isEncryptionAvailable()) {
                return safeStorage.encryptString(str);
            }
            console.warn(`encryption not available, storing as plaintext`);
            return str;
        });

        ipcMain.handle("decryptString", async (event, buffer: Buffer) => {
            if (safeStorage.isEncryptionAvailable()) {
                return safeStorage.decryptString(buffer);
            }
            console.warn(`encryption not available, returning buffer`);
            return buffer.toString();
        });
    }

    protected getInfo() {
        const resourcesPath = path.join(this.app.getAppPath(), "resources").split("resources")[0] + "resources";
        const paths = envPaths(app.getName(), { suffix: "" });

        const displayIds = screen.getAllDisplays().map((display) => display.id);
        let currentDisplayId = 0;
        if (this.mainWindow) {
            currentDisplayId = screen.getDisplayNearestPoint(this.mainWindow.window.getBounds()).id;
        }

        const info: Info = {
            resourcesPath,
            contentPath: paths.data,
            configPath: paths.config,
            lobby: {
                name: "BAR Lobby",
                version: this.app.getVersion(),
                hash: "123", // TODO: generate and inject checksum of app build in CI pipeline
            },
            hardware: {
                numOfDisplays: displayIds.length,
                currentDisplayIndex: displayIds.indexOf(currentDisplayId),
            },
        };

        return info;
    }

    protected async setupSteam() {
        try {
            const steamworks = await import("steamworks.js");

            const client = steamworks.init(480);
            console.log(client.localplayer.getName());
        } catch (err) {
            console.error(err);
        }
    }
}

unhandled();

new Application(app);
