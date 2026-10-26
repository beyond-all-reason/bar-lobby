// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";
import type { MainWindowApi } from "@preload/preload";

export const mainWindowApi = {
    setFullscreen: (flag: boolean) => ipcCall("mainWindow:setFullscreen", () => window.mainWindow.setFullscreen(flag)),
    setMaximized: (flag: boolean) => ipcCall("mainWindow:setMaximized", () => window.mainWindow.setMaximized(flag)),
    setSize: (width: number, height: number) => ipcCall("mainWindow:setSize", () => window.mainWindow.setSize(width, height)),
    setUiScale: (scale: number | null) => ipcCall("mainWindow:setUiScale", () => window.mainWindow.setUiScale(scale)),
    setDisplay: (index: number) => ipcCall("mainWindow:setDisplay", () => window.mainWindow.setDisplay(index)),
    minimize: () => ipcCall("mainWindow:minimize", () => window.mainWindow.minimize()),
    getDisplays: () => ipcCall("mainWindow:getDisplays", () => window.mainWindow.getDisplays()),
    getScaleRange: () => ipcCall("mainWindow:getScaleRange", () => window.mainWindow.getScaleRange()),
    onScaleRangeChanged: (handler: Parameters<MainWindowApi["onScaleRangeChanged"]>[0]) => window.mainWindow.onScaleRangeChanged(handler),
    onWindowStateChanged: (handler: Parameters<MainWindowApi["onWindowStateChanged"]>[0]) => window.mainWindow.onWindowStateChanged(handler),
    onUiScaleNudged: (handler: (scale: number | null) => void) => window.mainWindow.onUiScaleNudged(handler),
};
