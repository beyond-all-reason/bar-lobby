// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { STATE_PATH, CONFIG_PATH, WRITE_DATA_PATH, REPLAYS_PATH, getAssetsPath } from "@main/config/app";
import { shell } from "electron";
import { ipcMain, IpcResult } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import path from "path";

const REPLAY_SERVICE_URL = "https://bar-rts.com/replays";
const NEWS_SERVICE_URL = "https://www.beyondallreason.info/news";

const log = logger("shell-service");

const success: IpcResult = { status: "success", data: undefined };

function failed(reason: string, details?: string): IpcResult {
    log.error(`${reason}${details ? `: ${details}` : ""}`);

    return { status: "failed", reason, details };
}

// Anything escaping these handlers reaches the renderer as an unhandled rejection, which Error.vue
// turns into an unrecoverable modal. Failures have to come back as data instead.
async function attempt(reason: string, action: () => Promise<void> | void): Promise<IpcResult> {
    try {
        await action();

        return success;
    } catch (err) {
        return failed(reason, err instanceof Error ? err.message : String(err));
    }
}

// shell.openPath resolves with an error message instead of rejecting, and an empty string on success.
async function openPath(target: string): Promise<IpcResult> {
    return attempt("open_failed", async () => {
        const error = await shell.openPath(target);
        if (error) throw new Error(error);
    });
}

// Careful with shell.openExternal. https://benjamin-altpeter.de/shell-openexternal-dangers/
async function openInBrowser(url: string): Promise<IpcResult> {
    if (!["https:", "http:"].includes(new URL(url).protocol)) return failed("url_not_allowed", url);

    // Additional checks to prevent opening arbitrary URLs
    if (![REPLAY_SERVICE_URL, NEWS_SERVICE_URL].some((serviceUrl) => url.startsWith(serviceUrl))) return failed("url_not_allowed", url);

    return attempt("open_failed", () => shell.openExternal(url));
}

function registerIpcHandlers() {
    ipcMain.handle("shell:openStateDir", () => openPath(STATE_PATH));
    ipcMain.handle("shell:openAssetsDir", () => openPath(getAssetsPath()));
    ipcMain.handle("shell:openSettingsFile", () => openPath(path.join(CONFIG_PATH, "settings.json")));
    ipcMain.handle("shell:openStartScript", () => openPath(path.join(WRITE_DATA_PATH, "script.txt")));
    ipcMain.handle("shell:openReplaysDir", () => openPath(REPLAYS_PATH));
    ipcMain.handle("shell:showReplayInFolder", (_event, fileName: string) => attempt("open_failed", () => shell.showItemInFolder(path.join(REPLAYS_PATH, fileName))));

    // External
    ipcMain.handle("shell:openInBrowser", (_event, url) => openInBrowser(url));
}

export const shellService = {
    registerIpcHandlers,
};
