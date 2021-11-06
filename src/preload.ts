import { settingsAPIFactory } from "@/api/settings";
import { PreloadConfig } from "@/main";
import { HardwareInfo } from "@/model/hardware-info";
import { contextBridge, ipcRenderer } from "electron";

(async () => {
    const { settingsFilePath }: PreloadConfig = JSON.parse(process.argv[process.argv.length - 1]);

    const settings = await settingsAPIFactory({ settingsFilePath });

    contextBridge.exposeInMainWorld("api", {
        settings
    });

    contextBridge.exposeInMainWorld("getHardwareInfo", async () => ipcRenderer.invoke("get-hardware-info"));
})();

declare global {
    interface Window {
        getHardwareInfo: () => Promise<HardwareInfo>;
    }
}