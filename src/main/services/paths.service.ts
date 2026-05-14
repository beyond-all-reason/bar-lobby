import { dialog, app } from "electron";
import { setAssetsPath, ASSETS_PATH } from "@main/config/app";
import { settingsService } from "./settings.service";
import engineService from "./engine.service";
import mapsService from "./maps.service";
import gameService from "./game.service";
import { ipcMain } from "@main/typed-ipc";
import fs from "fs";

function registerIpcHandlers() {
    // First start app: change path + reinit without restart
    ipcMain.handle("paths:reinit", async (_, newAssetsPath: string) => {
        await settingsService.updateSettings({ assetsPath: newAssetsPath });
        setAssetsPath(newAssetsPath);
        await engineService.reinit();
        await mapsService.reinit();
        await gameService.reinit();
    });

    ipcMain.handle("paths:selectFolder", async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ["openDirectory"],
        });
        return canceled ? null : filePaths[0];
    });

    ipcMain.handle("paths:moveAndRestart", async (_, newAssetsPath: string) => {
        await fs.promises.cp(ASSETS_PATH, newAssetsPath, { recursive: true });
        await settingsService.updateSettings({ assetsPath: newAssetsPath });
        app.relaunch();
        app.quit();
    });

    ipcMain.handle("paths:changeAndRestart", async (_, newAssetsPath: string) => {
        await settingsService.updateSettings({ assetsPath: newAssetsPath });
        app.relaunch();
        app.quit();
    });

    ipcMain.handle("paths:getCurrentAssetsPath", () => ASSETS_PATH);
}

export const pathsService = { registerIpcHandlers };
