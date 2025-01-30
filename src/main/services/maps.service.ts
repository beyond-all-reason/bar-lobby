import { MapData } from "@main/content/maps/map-data";
import { mapContentAPI } from "@main/content/maps/map-content";
import { ipcMain } from "electron";
import { MapMetadata } from "@main/content/maps/map-metadata";
import { fetchMapImages } from "@main/content/maps/map-image";

async function init() {
    await mapContentAPI.init();
}

async function fetchAllMaps() {
    const maps = await fetch("https://maps-metadata.beyondallreason.dev/latest/lobby_maps.validated.json");
    const mapsAsObject = await maps.json();
    const mapsAsArray = Object.values(mapsAsObject) as MapMetadata[];
    return mapsAsArray.map((map: MapMetadata) => {
        // transform the map object to a MapData object
        return {
            ...map,
            isInstalled: mapContentAPI.isVersionInstalled(map.springName),
        } as MapData;
    });
}

function registerIpcHandlers(mainWindow: Electron.BrowserWindow) {
    ipcMain.handle("maps:downloadMap", (_, springName: string) => mapContentAPI.downloadMap(springName));
    ipcMain.handle("maps:downloadMaps", (_, springNames: string[]) => mapContentAPI.downloadMaps(springNames));
    ipcMain.handle("maps:getInstalledVersions", () => mapContentAPI.availableVersions);
    ipcMain.handle("maps:isVersionInstalled", (_, id: string) => mapContentAPI.isVersionInstalled(id));
    ipcMain.handle("maps:attemptCacheErrorMaps", () => mapContentAPI.attemptCacheErrorMaps());

    ipcMain.handle("maps:online:fetchAllMaps", () => fetchAllMaps());
    ipcMain.handle("maps:online:fetchMapImages", (_, imageSource: string) => fetchMapImages(imageSource));

    // Events
    mapContentAPI.onMapAdded.add((filename: string) => {
        mainWindow.webContents.send("maps:mapAdded", filename);
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
