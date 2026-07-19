// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { BrowserWindow, nativeImage } from "electron";
import path from "path";
import icon from "@main/resources/icon.png";

export function createSplashWindow(): BrowserWindow {
    const splashWindow = new BrowserWindow({
        title: "Beyond All Reason",
        width: 400,
        height: 350,
        resizable: false,
        center: true,
        frame: false,
        autoHideMenuBar: true,
        icon: nativeImage.createFromDataURL(icon),
        backgroundColor: "#000000",
    });

    if (!SPLASH_WINDOW_VITE_DEV_SERVER_URL) {
        splashWindow.loadFile(path.join(__dirname, `../splash/${SPLASH_WINDOW_VITE_NAME}/index.html`));
    } else {
        splashWindow.loadURL(SPLASH_WINDOW_VITE_DEV_SERVER_URL);
    }

    splashWindow.once("ready-to-show", () => {
        splashWindow.center();
        splashWindow.show();
        splashWindow.focus();
    });

    return splashWindow;
}
