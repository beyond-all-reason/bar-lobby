import { EngineVersion } from "@main/content/engine/engine-version";
import { engineContentAPI } from "@main/content/engine/engine-content";
import { ipcMain } from "electron";

async function init() {
    return engineContentAPI.init();
}

function registerIpcHandlers() {
    ipcMain.handle("engine:downloadEngine", (_, version: string) => engineContentAPI.downloadEngine(version));
    ipcMain.handle("engine:getInstalledVersions", () => engineContentAPI.installedVersions);
    ipcMain.handle("engine:isVersionInstalled", (_, id: string) => engineContentAPI.isVersionInstalled(id));
    ipcMain.handle("engine:uninstallVersion", (_, version: EngineVersion) => engineContentAPI.uninstallVersion(version));
}

const engineService = {
    init,
    registerIpcHandlers,
};

export default engineService;
