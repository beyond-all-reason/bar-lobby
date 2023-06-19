import { safeStorage } from "electron";
import { app, ipcMain, protocol, screen } from "electron";
import unhandled from "electron-unhandled";
import { autoUpdater } from "electron-updater";
import envPaths from "env-paths";
import os from "os";
import path from "path";

import { StoreAPI } from "@/api/store";
import { MainWindow } from "@/main-window";
import type { Info } from "$/model/info";
import { settingsSchema } from "$/model/settings";

/** Steam integration, commented out until we have a dedicated app id */
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const steamworks = require("steamworks.js");
// const client = steamworks.init(480);
// console.log(client.localplayer.getName());
// steamworks.electronEnableSteamOverlay();

export class Application {
    protected mainWindow?: MainWindow;
    protected settings?: StoreAPI<typeof settingsSchema>;
    protected initialised = false;

    constructor() {
        app.setName("Beyond All Reason");

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

        app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");

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

        app.on("ready", () => this.onReady());
        app.on("window-all-closed", () => app.quit());
        app.on("browser-window-focus", () => this.mainWindow?.window.flashFrame(false));
        app.on("web-contents-created", (event, contents) => {
            contents.on("will-navigate", (event, navigationUrl) => {
                const parsedUrl = new URL(navigationUrl);
                if (process.env.ELECTRON_RENDERER_URL && parsedUrl.protocol == "http:" && parsedUrl == new URL(process.env.ELECTRON_RENDERER_URL)) {
                    return; //allow
                }
                if (parsedUrl.protocol == "file:" && parsedUrl.pathname) {
                    if (path.resolve(parsedUrl.pathname) == path.resolve(path.join(__dirname, "../renderer/index.html"))) {
                        return; //allow
                    }
                }
                event.preventDefault(); //disallow
            });
        });
    }

    protected async onReady() {
        if (process.env.NODE_ENV !== "production") {
            try {
                // await installExtension(VUEJS_DEVTOOLS);
            } catch (err) {
                console.error("Vue Devtools failed to install:", err?.toString());
            }
        } else if (app.isPackaged && process.env.NODE_ENV === "production") {
            autoUpdater.checkForUpdatesAndNotify();
        }

        if (!this.initialised) {
            this.initialised = true;
            await this.init();
        }
    }

    protected async init() {
        const info = this.getInfo();
        const settingsFilePath = path.join(info.configPath, "settings.json");
        this.settings = await new StoreAPI(settingsFilePath, settingsSchema).init();

        this.mainWindow = new MainWindow(this.settings);

        this.mainWindow.window.on("restore", () => this.mainWindow?.window.flashFrame(false));

        this.setupHandlers();
        this.setupSecondInstanceOpened();
    }

    protected setupSecondInstanceOpened() {
        app.on("second-instance", (_event, commandLine, _workingDirectory, _additionalData) => {
            console.log("Second Instance opening with command line: " + commandLine);

            this.focusWindows();

            this.openFile(commandLine[commandLine.length - 1]);
        });

        app.on("open-file", (_, path) => {
            console.log("Mac OS opening file: " + path);

            this.focusWindows();

            this.openFile(path);
        });
    }

    protected openFile(path: string) {
        if (!path.endsWith(".sdfz")) {
            return;
        }
        this.mainWindow?.window.webContents.send("open-replay", path);
    }

    private focusWindows() {
        if (this.mainWindow?.window) {
            if (this.mainWindow?.window.isMinimized()) this.mainWindow?.window.restore();
            this.mainWindow?.window.focus();
        }
    }

    protected setupHandlers() {
        ipcMain.handle("getInfo", async () => {
            return this.getInfo();
        });

        ipcMain.handle("flashFrame", (_event, flag: boolean) => {
            this.mainWindow?.window.flashFrame(flag);
        });

        ipcMain.handle("encryptString", async (_event, str: string) => {
            if (safeStorage.isEncryptionAvailable()) {
                return safeStorage.encryptString(str);
            }
            console.warn(`encryption not available, storing as plaintext`);
            return str;
        });

        ipcMain.handle("decryptString", async (_event, buffer: Buffer) => {
            if (safeStorage.isEncryptionAvailable()) {
                return safeStorage.decryptString(buffer);
            }
            console.warn(`encryption not available, returning buffer`);
            return buffer.toString();
        });
        let openedReplayAlready = false;
        ipcMain.handle("opened-replay", () => {
            console.log(process.argv);
            if (process.argv.length == 0 || openedReplayAlready) return null;
            openedReplayAlready = true; //in case of reloading the app do not open replay again
            return process.argv[process.argv.length - 1].endsWith(".sdfz") ? process.argv[process.argv.length - 1] : null;
        });
    }

    protected getInfo() {
        const resourcesPath = path.join(app.getAppPath(), "resources").split("resources")[0] + "resources";
        const paths = envPaths(app.getName(), { suffix: "" });

        const displayIds = screen.getAllDisplays().map((display) => display.id);
        let currentDisplayId = 0;
        if (this.mainWindow) {
            currentDisplayId = screen.getDisplayNearestPoint(this.mainWindow.window.getBounds()).id;
        }

        const networkInterfaces = os.networkInterfaces();
        const defaultNetworkInterface = networkInterfaces["Ethernet"]?.[0] ?? Object.values(networkInterfaces)[0]?.[0];

        const info: Info = {
            resourcesPath,
            contentPath: paths.data,
            configPath: paths.config,
            lobby: {
                name: "BAR Lobby",
                version: app.getVersion(),
                hash: defaultNetworkInterface?.mac ?? "123",
            },
            hardware: {
                numOfDisplays: displayIds.length,
                currentDisplayIndex: displayIds.indexOf(currentDisplayId),
            },
        };

        return info;
    }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    unhandled();
    new Application();
}
