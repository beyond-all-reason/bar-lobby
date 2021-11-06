import * as path from "path";
import { app, protocol, BrowserWindow, shell, screen, ipcMain } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import { HardwareInfo } from "@/model/hardware-info";

const isDev = process.env.NODE_ENV !== "production";

export interface PreloadConfig {
    settingsFilePath: string;
}

export const preloadConfig: PreloadConfig = {
    settingsFilePath: path.join(app.getPath("userData"), "settings.json")
};

protocol.registerSchemesAsPrivileged([{
    scheme: "app",
    privileges: {
        secure: true,
        standard: true,
        stream: true
    } 
}]);

const fullscreenMode = false;

async function createWindow() {
    const mainWindow = new BrowserWindow({
        title: "BAR Lobby",
        fullscreen: fullscreenMode,
        frame: !fullscreenMode,
        resizable: !fullscreenMode,
        show: false,
        icon: path.join(__static, "icon.png"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
            additionalArguments: [JSON.stringify(preloadConfig)]
        }
    });
    
    mainWindow.once("ready-to-show", () => {
        const chosenDisplay = 1;
        const { x, y } = screen.getAllDisplays()[chosenDisplay].bounds;
        mainWindow.setPosition(x, y);

        if (!fullscreenMode) {
            mainWindow.maximize();
        }

        mainWindow.setMenuBarVisibility(false);
        
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
        if (!process.env.IS_TEST) mainWindow.webContents.openDevTools();
    } else {
        createProtocol("app");
        mainWindow.loadURL("app://./index.html");
    }
}

app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("ready", async () => {
    if (isDev && !process.env.IS_TEST) {
        try {
            await installExtension(VUEJS3_DEVTOOLS);
        } catch (e: any) {
            console.error("Vue Devtools failed to install:", e.toString());
        }
    }
    createWindow();
});

if (isDev) {
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

const getHardwareInfo: () => Promise<HardwareInfo> = async function () {
    return {
        screenIds: screen.getAllDisplays().map(screen => screen.id)
    };
};

ipcMain.handle("get-hardware-info", getHardwareInfo);

const changeDisplay: (displayId: number) => Promise<void> = async function (displayId) {
    
};