import { engineContentAPI } from "@main/content/engine/engine-content";
import { gameContentAPI } from "@main/content/game/game-content";
import { mapContentAPI } from "@main/content/maps/map-content";
import { BrowserWindow } from "electron";

function registerIpcHandlers(mainWindow: BrowserWindow) {
    engineContentAPI.onDownloadStart.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:engine:start", downloadInfo);
    });
    engineContentAPI.onDownloadComplete.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:engine:complete", downloadInfo);
    });
    engineContentAPI.onDownloadProgress.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:engine:progress", downloadInfo);
    });
    engineContentAPI.onDownloadFail.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:engine:fail", downloadInfo);
    });

    gameContentAPI.onDownloadStart.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:game:start", downloadInfo);
    });
    gameContentAPI.onDownloadComplete.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:game:complete", downloadInfo);
    });
    gameContentAPI.onDownloadProgress.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:game:progress", downloadInfo);
    });
    gameContentAPI.onDownloadFail.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:game:fail", downloadInfo);
    });

    mapContentAPI.onDownloadStart.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:map:start", downloadInfo);
    });
    mapContentAPI.onDownloadComplete.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:map:complete", downloadInfo);
    });
    mapContentAPI.onDownloadProgress.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:map:progress", downloadInfo);
    });
    mapContentAPI.onDownloadFail.add((downloadInfo) => {
        mainWindow.webContents.send("downloads:map:fail", downloadInfo);
    });
}

const downloadsService = {
    registerIpcHandlers,
};

export default downloadsService;
