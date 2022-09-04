import type { App } from "electron";
import { app, ipcMain, protocol, screen } from "electron";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import unhandled from "electron-unhandled";
import path from "path";
import steamworks from "steamworks.js";

import { StoreAPI } from "@/api/store";
import { MainWindow } from "@/main-window";
import type { Info } from "@/model/info";
import { ReplayData } from "@/model/replay";
import type { SettingsType } from "@/model/settings";
import { settingsSchema } from "@/model/settings";
import { ReplayManager } from "@/workers/replay-manager";

const isProd = process.env.NODE_ENV === "production";
export class Application {
    protected app: App;
    protected mainWindow?: MainWindow;
    protected settings?: StoreAPI<SettingsType>;
    protected replayManager?: ReplayManager;

    constructor(app: App) {
        this.app = app;

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

        const client = steamworks.init(480);
        console.log(client.localplayer.getName());

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
        this.app.on("window-all-closed", () => this.app.quit());
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

    protected setupHandlers() {
        // TODO: refactor this info into session store api?
        ipcMain.handle("getInfo", async (event) => {
            const appPath = this.app.getAppPath();
            const contentPath = path.join(this.app.getPath("userData"), "content");

            const displayIds = screen.getAllDisplays().map((display) => display.id);
            const currentDisplayId = screen.getDisplayNearestPoint(this.mainWindow!.window.getBounds()).id;

            const info: Info = {
                appPath,
                contentPath,
                lobby: {
                    name: this.app.getName(),
                    version: this.app.getVersion(),
                    hash: "123", // TODO: generate and inject checksum of app build in CI pipeline
                },
                hardware: {
                    numOfDisplays: displayIds.length,
                    currentDisplayIndex: displayIds.indexOf(currentDisplayId),
                },
            };

            return info;
        });

        ipcMain.handle("highlightTaskbarIcon", (event, shouldHighlight: boolean) => {
            this.mainWindow?.window.flashFrame(shouldHighlight);
        });

        ipcMain.handle("initReplayManager", async () => {
            // TODO: breaks because of pg import error
            //this.replayManager = await new ReplayManager(this.settings!).init();
        });

        ipcMain.handle("saveReplay", async (event, replayData: ReplayData) => {
            this.replayManager?.saveReplay(replayData);
        });
    }
}

unhandled();

new Application(app);
