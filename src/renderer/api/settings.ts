// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { Settings } from "@main/services/settings.service";
import { ipcCall } from "@renderer/api/ipc-call";

export const settingsApi = {
    get: () => ipcCall("settings:get", () => window.settings.getSettings()),
    update: (settings: Partial<Settings>) => ipcCall("settings:update", () => window.settings.updateSettings(settings)),
};
