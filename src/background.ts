import * as path from "path";
import { app, protocol, BrowserWindow, shell } from "electron";
import { createProtocol } from "vue-cli-plugin-electron-builder/lib";
import installExtension, { VUEJS3_DEVTOOLS } from "electron-devtools-installer";
import Store from "electron-store";
import { Static, Type } from "@sinclair/typebox";

const isDevelopment = process.env.NODE_ENV !== "production";

const configSchema = Type.Object({
    winBounds: Type.Object({
        x: Type.Number(),
        y: Type.Number(),
        width: Type.Number(),
        height: Type.Number()
    })
});

type ConfigSchema = Static<typeof configSchema>;

const store = new Store<ConfigSchema>({
    schema: Type.Strict(configSchema).properties
});

protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { secure: true, standard: true } }
]);

async function createWindow() {
    const bounds = store.get("winBounds");

    const mainWindow = new BrowserWindow({
        title: "BAR Lobby",
        fullscreen: !isDevelopment,
        frame: false,
        ...bounds,
        show: false,
        webPreferences: {
            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION as unknown as boolean,
            contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION
        }
    });

    mainWindow.once("ready-to-show", () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    mainWindow.on("close", () => {
        store.set("winBounds", mainWindow.getBounds());
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
    registerLocalVideoProtocol();

    if (isDevelopment && !process.env.IS_TEST) {
        try {
            await installExtension(VUEJS3_DEVTOOLS);
        } catch (e: any) {
            console.error("Vue Devtools failed to install:", e.toString());
        }
    }
    createWindow();
});

if (isDevelopment) {
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

// https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/872#issuecomment-656292808
function registerLocalVideoProtocol () {
    protocol.registerFileProtocol("local-video", (request, callback) => {
        const url = request.url.replace(/^local-video:\/\//, "");
        // Decode URL to prevent errors when loading filenames with UTF-8 chars or chars like "#"
        const decodedUrl = decodeURI(url); // Needed in case URL contains spaces
        try {
            return callback(path.join(__static, decodedUrl));
        } catch (error) {
            console.error(
                "ERROR: registerLocalVideoProtocol: Could not get file path:",
                error
            );
        }
    });
}