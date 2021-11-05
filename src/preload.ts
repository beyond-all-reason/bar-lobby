import { settingsAPIFactory } from "@/api/settings";
import { PreloadConfig } from "@/main";
import { contextBridge } from "electron";

(async () => {
    const { settingsFilePath }: PreloadConfig = JSON.parse(process.argv[process.argv.length - 1]);

    const settings = await settingsAPIFactory({ settingsFilePath });

    contextBridge.exposeInMainWorld("api", {
        settings
    });
})();