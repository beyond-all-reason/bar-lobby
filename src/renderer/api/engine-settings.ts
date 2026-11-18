// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { ipcCall } from "@renderer/api/ipc-call";
import type { EngineSettingsView } from "@shared/engine-settings/view";

export const engineSettingsApi = {
    get: () => ipcCall("engineSettings:get", () => window.engineSettings.get()),
    // Each returns the settings as main kept them.
    set: (key: string, value: string) => ipcCall("engineSettings:set", () => window.engineSettings.set(key, value)),
    reset: (key: string) => ipcCall("engineSettings:reset", () => window.engineSettings.reset(key)),
    // Every change, including ones a game made. Gives the function that unsubscribes.
    onChanged: (handler: (view: EngineSettingsView) => void) => window.engineSettings.onChanged(handler),
};
