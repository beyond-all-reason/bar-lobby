import * as path from "path";
import { app, protocol, BrowserWindow, shell, screen } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import Store from "electron-store";

const store = new Store();

const isDev = process.env.NODE_ENV !== "production";

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
            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION as unknown as boolean,
            contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
            preload: path.join(__dirname, "preload.js")
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
    //registerLocalVideoProtocol();

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