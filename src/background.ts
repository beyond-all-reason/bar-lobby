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
        fullscreen: !isDevelopment,
        frame: false,
        ...bounds,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            enableRemoteModule: true
        }
    });

    mainWindow.once("ready-to-show", () => {
        //mainWindow.removeMenu();
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
        await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
        if (!process.env.IS_TEST) mainWindow.webContents.openDevTools();
    } else {
        createProtocol("app");
        mainWindow.loadURL("app://./index.html");
    }
}

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("ready", async () => {
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
