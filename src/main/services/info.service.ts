// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { app, screen, BrowserWindow } from "electron";
import { ipcMain } from "@main/typed-ipc";
import os from "os";
import { STATE_PATH, getAssetsPath } from "@main/config/app";
import { EDITION, EDITION_FEATURES } from "@main/config/edition";
import { Edition, EditionFeatures } from "@shared/edition";

export type Info = {
    edition: Edition;
    features: EditionFeatures;
    statePath: string;
    assetsPath: string;
    lobby: {
        name: string;
        version: string;
        hash: string;
    };
    hardware: {
        numOfDisplays: number;
        currentDisplayIndex: number;
    };
};

function getInfo() {
    const displayIds = screen.getAllDisplays().map((display) => display.id);
    let currentDisplayId = 0;
    const ID = process.env.MAIN_WINDOW_ID ? Number.parseInt(process.env.MAIN_WINDOW_ID) : undefined;
    const point = ID && BrowserWindow.fromId(ID)?.getBounds();
    currentDisplayId = ID && point ? screen.getDisplayNearestPoint(point).id : currentDisplayId;

    const networkInterfaces = os.networkInterfaces();
    const defaultNetworkInterface = networkInterfaces["Ethernet"]?.[0] ?? Object.values(networkInterfaces)[0]?.[0];
    const info: Info = {
        edition: EDITION,
        features: EDITION_FEATURES,
        statePath: STATE_PATH,
        assetsPath: getAssetsPath(),
        lobby: {
            name: "BAR Lobby",
            version: app.getVersion(),
            hash: defaultNetworkInterface?.mac ?? "123",
        },
        hardware: {
            numOfDisplays: displayIds.length,
            currentDisplayIndex: displayIds.indexOf(currentDisplayId),
        },
    };
    return info;
}

function registerIpcHandlers() {
    ipcMain.handle("info:get", getInfo);
}

export const infoService = {
    registerIpcHandlers,
};
