// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcMain } from "@main/typed-ipc";
import { BarIpcWebContents } from "@main/typed-ipc";
import { ModContentAPI } from "@main/content/mods/mod-content";
import { ModInstallOptions, ModType } from "@main/content/mods/mod-types";
import { MOD_PATHS } from "@main/config/app";

const modContentAPI = new ModContentAPI();

async function init() {
    await modContentAPI.init();
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    // Mod management
    ipcMain.handle("mod:getInstalledMods", () => modContentAPI.availableVersions.values().toArray());
    ipcMain.handle("mod:getModsByType", (_, modType: ModType) => modContentAPI.getModsByType(modType));
    ipcMain.handle("mod:getModsByGame", (_, gameShortName: string) => modContentAPI.getModsByGame(gameShortName));
    ipcMain.handle("mod:getMod", (_, modId: string) => modContentAPI.getMod(modId));
    ipcMain.handle("mod:isModInstalled", (_, modId: string) => modContentAPI.isModInstalled(modId));

    // Mod installation
    ipcMain.handle("mod:installFromGitHub", async (_, options: ModInstallOptions) => {
        return await modContentAPI.installModFromGitHub(options);
    });
    ipcMain.handle("mod:uninstallMod", async (_, modId: string) => {
        return await modContentAPI.uninstallMod(modId);
    });
    ipcMain.handle("mod:updateMod", async (_, modId: string) => {
        return await modContentAPI.updateMod(modId);
    });

    // Mod validation
    ipcMain.handle("mod:checkModExists", async (_, repository: string, gitRef: string) => {
        return await modContentAPI.githubDownloader.checkModExists(repository, gitRef);
    });
    ipcMain.handle("mod:getModInfo", async (_, repository: string, gitRef: string) => {
        return await modContentAPI.githubDownloader.getModInfo(repository, gitRef);
    });
    ipcMain.handle("mod:getModPaths", () => [...MOD_PATHS]);

    // Events
    modContentAPI.onModInstalled.add((modId) => {
        webContents.send("mod:installed", modId);
    });

    modContentAPI.onModUninstalled.add((modId) => {
        webContents.send("mod:uninstalled", modId);
    });

    modContentAPI.onModConflict.add((conflict) => {
        webContents.send("mod:conflict", conflict);
    });
}

const modService = {
    init,
    registerIpcHandlers,
};

export default modService;
