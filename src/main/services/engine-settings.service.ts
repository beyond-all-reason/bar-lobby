// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { WebContents } from "electron";
import { engineConfig, InvalidEngineSettingError } from "@main/game/engine-config/engine-config";
import { UnusableSettingsFileError } from "@main/game/engine-config/override-files";
import { ipcMain } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { overIpc } from "@main/utils/over-ipc";
import type { EngineSettingsFailure } from "@shared/engine-settings/view";

const log = logger("engine-settings.service.ts");

export const failureOf = (err: unknown): EngineSettingsFailure =>
    err instanceof UnusableSettingsFileError ? "settings_unusable" : err instanceof InvalidEngineSettingError ? "invalid_setting" : "settings_failed";

// Set and reset answer with the whole view, so the renderer shows what main kept, defaults applied.
function registerIpcHandlers(webContents: WebContents) {
    ipcMain.handle("engineSettings:get", () => overIpc(engineConfig.getView, failureOf));
    ipcMain.handle("engineSettings:set", (_, key: string, value: string) => overIpc(() => engineConfig.setSetting(key, value).then(engineConfig.getView), failureOf));
    ipcMain.handle("engineSettings:reset", (_, key: string) => overIpc(() => engineConfig.resetSetting(key).then(engineConfig.getView), failureOf));

    // Every change, whatever made it: the client, a game that closed, or the status of the master files.
    engineConfig.onChanged.add(() => {
        engineConfig
            .getView()
            .then((view) => webContents.send("engineSettings:changed", view))
            .catch((err) => log.error("Could not tell the renderer about changed engine settings", err));
    });
}

export const engineSettingsService = { registerIpcHandlers };
