import { settingsAPIFactory } from "@/api/settings";
import { contextBridge, ipcRenderer } from "electron";
import { PreloadConfig } from "@/model/preload-config";

(async () => {
    const { settingsFilePath }: PreloadConfig = JSON.parse(process.argv[process.argv.length - 1]);

    const settings = await settingsAPIFactory({ settingsFilePath });

    contextBridge.exposeInMainWorld("api", {
        settings
    });

    contextBridge.exposeInMainWorld("getHardwareInfo", async (...args: any[]) => ipcRenderer.invoke("get-hardware-info", ...args));
    contextBridge.exposeInMainWorld("setDisplay", (...args: any[]) => ipcRenderer.invoke("set-display", ...args));
})();