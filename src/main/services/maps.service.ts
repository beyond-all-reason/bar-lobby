// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MapData, MapDownloadData } from "@main/content/maps/map-data";
import { contentAPI } from "@main/content/content-api";
import { ipcMain, BarIpcWebContents } from "@main/typed-ipc";
import { MapMetadata } from "@main/content/maps/map-metadata";
import { fetchMapImages } from "@main/content/maps/map-image";

const FETCH_MAPS_TIMEOUT_MS = 15_000;

async function fetchAllMaps(): Promise<[MapData[], MapDownloadData[]]> {
    const maps = await fetch("https://maps-metadata.beyondallreason.dev/latest/lobby_maps.validated.json", {
        signal: AbortSignal.timeout(FETCH_MAPS_TIMEOUT_MS),
    });
    const mapsAsObject = await maps.json();
    const mapsAsArray = Object.values(mapsAsObject) as MapMetadata[];

    const liveMaps = mapsAsArray.map((map: MapMetadata) => {
        // transform the map object to a MapData object
        return {
            ...map,
            isInstalled: contentAPI.isPresent({ type: "map", id: map.springName }),
        } satisfies MapData;
    });

    const liveMapsSet = new Set(liveMaps.map((m) => m.springName));

    const nonLiveMaps = contentAPI
        .installed("map")
        .filter((ref) => !liveMapsSet.has(ref.id))
        .map((ref) => {
            return {
                springName: ref.id,
                isDownloading: false,
                isInstalled: true,
            } satisfies MapDownloadData;
        });

    return [liveMaps, nonLiveMaps];
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    ipcMain.handle("maps:downloadMap", (_, springName: string) => contentAPI.ensure([{ type: "map", id: springName }]));
    ipcMain.handle("maps:downloadMaps", (_, springNames: string[]) => contentAPI.ensure(springNames.map((springName) => ({ type: "map" as const, id: springName }))));
    ipcMain.handle("maps:getInstalledMapNames", () => contentAPI.installed("map").map((ref) => ref.id));
    ipcMain.handle("maps:isVersionInstalled", (_, id: string) => contentAPI.isPresent({ type: "map", id }));

    ipcMain.handle("maps:online:fetchAllMaps", () => fetchAllMaps());
    ipcMain.handle("maps:online:fetchMapImages", (_, imageSource: string) => fetchMapImages(imageSource));

    // Events
    contentAPI.onPresenceChanged.add(({ type, id, present }) => {
        if (type !== "map") {
            return;
        }

        webContents.send(present ? "maps:mapAdded" : "maps:mapDeleted", id);
    });
}

const mapsService = {
    registerIpcHandlers,
};

export default mapsService;
