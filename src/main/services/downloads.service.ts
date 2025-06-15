// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { engineContentAPI } from "@main/content/engine/engine-content";
import { gameContentAPI } from "@main/content/game/game-content";
import { mapContentAPI } from "@main/content/maps/map-content";
import { BarIpcWebContents } from "@main/typed-ipc";

function registerIpcHandlers(webContents: BarIpcWebContents) {
    engineContentAPI.onDownloadStart.add((downloadInfo) => {
        webContents.send("downloads:engine:start", downloadInfo);
    });
    engineContentAPI.onDownloadComplete.add((downloadInfo) => {
        webContents.send("downloads:engine:complete", downloadInfo);
    });
    engineContentAPI.onDownloadProgress.add((downloadInfo) => {
        webContents.send("downloads:engine:progress", downloadInfo);
    });
    engineContentAPI.onDownloadFail.add((downloadInfo) => {
        webContents.send("downloads:engine:fail", downloadInfo);
    });

    gameContentAPI.onDownloadStart.add((downloadInfo) => {
        webContents.send("downloads:game:start", downloadInfo);
    });
    gameContentAPI.onDownloadComplete.add((downloadInfo) => {
        webContents.send("downloads:game:complete", downloadInfo);
    });
    gameContentAPI.onDownloadProgress.add((downloadInfo) => {
        webContents.send("downloads:game:progress", downloadInfo);
    });
    gameContentAPI.onDownloadFail.add((downloadInfo) => {
        webContents.send("downloads:game:fail", downloadInfo);
    });

    mapContentAPI.onDownloadStart.add((downloadInfo) => {
        webContents.send("downloads:map:start", downloadInfo);
    });
    mapContentAPI.onDownloadComplete.add((downloadInfo) => {
        webContents.send("downloads:map:complete", downloadInfo);
    });
    mapContentAPI.onDownloadProgress.add((downloadInfo) => {
        webContents.send("downloads:map:progress", downloadInfo);
    });
    mapContentAPI.onDownloadFail.add((downloadInfo) => {
        webContents.send("downloads:map:fail", downloadInfo);
    });
}

const downloadsService = {
    registerIpcHandlers,
};

export default downloadsService;
