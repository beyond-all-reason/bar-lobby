import { API } from "@/model/api";
import { contextBridge, ipcRenderer } from "electron";

const api: API = {
    settings: {
        getSettings: () => ipcRenderer.invoke("getSettings"),
        setSetting: (key, value) => {
            return ipcRenderer.invoke("setSetting", key, value);
        },
    },
    getHardwareInfo: () => ipcRenderer.invoke("getHardwareInfo"),
};

contextBridge.exposeInMainWorld("api", api);