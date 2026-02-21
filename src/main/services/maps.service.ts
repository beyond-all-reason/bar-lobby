// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MapData, MapDownloadData } from "@main/content/maps/map-data";
import { mapContentAPI } from "@main/content/maps/map-content";
import { ipcMain, BarIpcWebContents } from "@main/typed-ipc";
import { MapMetadata } from "@main/content/maps/map-metadata";
import { fetchMapImages } from "@main/content/maps/map-image";
import { network } from "@main/utils/network";

async function init() {
    await mapContentAPI.init();
}

async function fetchAllMaps(): Promise<[MapData[], MapDownloadData[]]> {
    if (!network.isOnline()) {
        return [[], []];
    }

    const maps = await fetch("https://maps-metadata.beyondallreason.dev/latest/lobby_maps.validated.json");
    const mapsAsObject = await maps.json();
    const mapsAsArray = Object.values(mapsAsObject) as MapMetadata[];

    const liveMaps = mapsAsArray.map((map: MapMetadata) => {
        // transform the map object to a MapData object
        return {
            ...map,
            isInstalled: mapContentAPI.isVersionInstalled(map.springName),
        } satisfies MapData;
    });

    const liveMapsSet = new Set(liveMaps.map((m) => m.springName));

    const nonLiveMaps = Object.entries(mapContentAPI.mapNameFileNameLookup)
        .map(([springName]) => {
            if (liveMapsSet.has(springName)) {
                return;
            }

            return {
                springName: springName,
                isDownloading: false,
                isInstalled: mapContentAPI.isVersionInstalled(springName),
            } satisfies MapDownloadData;
        })
        .filter((v) => v != undefined);

    return [liveMaps, nonLiveMaps];
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    ipcMain.handle("maps:downloadMap", async (_, springName: string) => {
        return mapContentAPI.downloadMap(springName);
    });

    ipcMain.handle("maps:downloadMaps", async (_, springNames: string[]) => {
        return mapContentAPI.downloadMaps(springNames);
    });

    ipcMain.handle("maps:getInstalledVersions", () => mapContentAPI.availableVersions);
    ipcMain.handle("maps:isVersionInstalled", (_, id: string) => mapContentAPI.isVersionInstalled(id));
    ipcMain.handle("maps:attemptCacheErrorMaps", () => mapContentAPI.attemptCacheErrorMaps());

    ipcMain.handle("maps:online:fetchAllMaps", () => fetchAllMaps());
    ipcMain.handle("maps:online:fetchMapImages", (_, imageSource: string) => fetchMapImages(imageSource));
    ipcMain.handle("maps:scanMaps", () => mapContentAPI.scanMaps());

    // Events
    mapContentAPI.onMapAdded.add((filename: string) => {
        webContents.send("maps:mapAdded", filename);
    });
    mapContentAPI.onMapDeleted.add((filename: string) => {
        webContents.send("maps:mapDeleted", filename);
    });
}

const mapsService = {
    init,
    registerIpcHandlers,
};

export default mapsService;
