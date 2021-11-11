//import { settingsAPIFactory } from "@/api/settings";
import { contextBridge, IpcRenderer, ipcRenderer } from "electron";
import { PreloadConfig } from "@/model/preload-config";
import { Router } from "vue-router";

(async () => {
    // const { settingsFilePath }: PreloadConfig = JSON.parse(process.argv[process.argv.length - 1]);

    // const settings = await settingsAPIFactory({ settingsFilePath });

    // contextBridge.exposeInMainWorld("api", {
    //     settings
    // });

    // contextBridge.exposeInMainWorld("getHardwareInfo", async (...args: any[]) => ipcRenderer.invoke("get-hardware-info", ...args));
    // contextBridge.exposeInMainWorld("setDisplay", (...args: any[]) => ipcRenderer.invoke("set-display", ...args));

    window.addEventListener("DOMContentLoaded", () => {
        contextBridge.exposeInMainWorld("ipcRenderer", ipcRenderer);
    });
})();