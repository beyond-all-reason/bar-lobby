import { MapData } from "@main/content/maps/map-data";
import { mapContentAPI } from "@main/content/maps/map-content";
import { ipcMain } from "electron";

function init() {
    mapContentAPI.init();
}

function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
    ipcMain.handle("maps:sync", (_, maps: { scriptName: string; fileName: string }) => mapContentAPI.sync(maps));
    ipcMain.handle("maps:downloadMap", (_, scriptName: string) => mapContentAPI.downloadMap(scriptName));
    ipcMain.handle("maps:downloadMaps", (_, scriptNames: string[]) => mapContentAPI.downloadMaps(scriptNames));
    ipcMain.handle("maps:getInstalledVersions", () => mapContentAPI.installedVersions);
    ipcMain.handle("maps:isVersionInstalled", (_, id: string) => mapContentAPI.isVersionInstalled(id));
    ipcMain.handle("maps:attemptCacheErrorMaps", () => mapContentAPI.attemptCacheErrorMaps());

    // Events
    mapContentAPI.onMapCachingStarted.add((filename: string) => {
        mainWindow.webContents.send("maps:mapCachingStarted", filename);
    });
    mapContentAPI.onMapCached.add((mapData: MapData) => {
        mainWindow.webContents.send("maps:mapCached", mapData);
    });
    mapContentAPI.onMapDeleted.add((filename: string) => {
        mainWindow.webContents.send("maps:mapDeleted", filename);
    });
}

const mapsService = {
    init,
    registerIpcHandlers,
};

export default mapsService;
