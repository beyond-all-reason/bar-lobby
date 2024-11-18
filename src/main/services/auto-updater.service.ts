import { app } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;

function init() {
    app.on("ready", () => {
        console.log("Checking for updates...");
        autoUpdater.checkForUpdatesAndNotify();
    });
}

// Examples: https://github.com/iffy/electron-updater-example/blob/master/main.js
function registerEvents() {
    // autoUpdater.on('checking-for-update', () => {
    // })
    // autoUpdater.on('update-available', (info) => {
    // })
    // autoUpdater.on('update-not-available', (info) => {
    // })
    // autoUpdater.on('error', (err) => {
    // })
    // autoUpdater.on('download-progress', (progressObj) => {
    // })
    // autoUpdater.on('update-downloaded', (info) => {
    //   autoUpdater.quitAndInstall();
    // })
}

export const autoUpdaterService = {
    init,
    registerEvents,
};
