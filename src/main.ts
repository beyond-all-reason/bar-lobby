import { app, App, ipcMain, protocol, screen } from "electron";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import unhandled from "electron-unhandled";
import * as path from "path";

import { MainWindow } from "@/main-window";
import { settingsSchema, SettingsType } from "@/model/settings";
import { StoreAPI } from "@/api/store";
import { Info } from "@/model/info";
import { GitDownloaderAPI } from "@/api/git-downloader";

export class Application {
    protected app: App;
    protected mainWindow!: MainWindow;
    protected settings!: StoreAPI<SettingsType>;
    protected gameDownloaderApi: GitDownloaderAPI;

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

        this.gameDownloaderApi = new GitDownloaderAPI(path.join(this.app.getPath("userData"), "content"));

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
        this.settings = await new StoreAPI<SettingsType>("settings", settingsSchema).init();

        this.mainWindow = new MainWindow(this.settings);
    }

    protected async onWindowAllClosed() {
        if (process.platform !== "darwin") {
            this.app.quit();
        }
    }

    protected setupHandlers() {
        ipcMain.handle("getInfo", async (event) => {
            const userDataPath = this.app.getPath("userData");

            const displayIds = screen.getAllDisplays().map(display => display.id);
            const currentDisplayId = screen.getDisplayNearestPoint(this.mainWindow.window.getBounds()).id;

            const info: Info = {
                lobby: {
                    name: this.app.getName(),
                    version: this.app.getVersion(),
                    hash: "123"
                },
                userDataPath: userDataPath,
                contentPath: path.join(userDataPath, "content"),
                hardware: {
                    numOfDisplays: displayIds.length,
                    currentDisplayIndex: displayIds.indexOf(currentDisplayId)
                }
            };

            return info;
        });

        ipcMain.handle("test", async (event) => {
            const testWorker = new Worker("./src/test.js", { type: "module" });
            testWorker.onmessage = event => {
                console.log(event.data);
            };
            testWorker.postMessage("yep");
        });

        // ipcMain.on("clone", async (event) => {
        //     this.gameDownloaderApi.onProgress.disposeAll();
        //     this.gameDownloaderApi.onProgress.add((progress) => {
        //         event.sender.send("clone-progress", progress);
        //     });

        //     await this.gameDownloaderApi.fetchLatest();
        // });
    }
}

unhandled();

new Application(app);