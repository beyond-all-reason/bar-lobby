import { SettingsRenderAPI } from "@/model/settings";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ipcRenderer", ipcRenderer);

const settingsRenderAPI: SettingsRenderAPI = {
    getSettings: () => ipcRenderer.invoke("getSettings"),
    //getSetting: (key) => ipcRenderer.invoke("getSetting", key),
    setSetting: (key, value) => {
        console.log(key, value);
        return ipcRenderer.invoke("setSetting", key, value);
    },
};

const api = {
    settings: settingsRenderAPI
};

contextBridge.exposeInMainWorld("api", api);

declare global {
    interface Window {
        api: typeof api;
    }
}