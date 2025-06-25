// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";

export type NavigationTarget = string;
const log = logger("navigation.service.ts");

function navigateTo(webContents: BarIpcWebContents, target: NavigationTarget) {
    webContents.send("navigation:navigateTo", target);
}

function registerIpcHandlers(webContents: BarIpcWebContents, customHandler?: () => void) {
    webContents.ipc.handle("renderer:ready", () => {
        log.info("Renderer is ready!");
    });

    if (customHandler) {
        customHandler();
    }
}

export const navigationService = {
    navigateTo: (webContents: BarIpcWebContents, target: NavigationTarget) => navigateTo(webContents, target),
    registerIpcHandlers: (webContents: BarIpcWebContents, customHandler?: () => void) => registerIpcHandlers(webContents, customHandler),
};
