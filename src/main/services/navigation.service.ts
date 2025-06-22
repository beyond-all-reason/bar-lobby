// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
import { BarIpcWebContents } from "@main/typed-ipc";

export type NavigationTarget = string; // Simple string type as you requested

function navigateTo(webContents: BarIpcWebContents, target: NavigationTarget) {
    webContents.send("navigation:navigateTo", target);
}

export const navigationService = {
    navigateTo: (webContents: BarIpcWebContents, target: NavigationTarget) => navigateTo(webContents, target),
};