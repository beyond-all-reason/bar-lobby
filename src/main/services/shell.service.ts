// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { STATE_PATH, CONFIG_PATH, WRITE_DATA_PATH, REPLAYS_PATH, getAssetsPath } from "@main/config/app";
import { shell } from "electron";
import { ipcMain, IpcResult } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import fs from "fs";
import path from "path";
import { configService } from "@main/services/config.service";

const log = logger("shell-service");

const success: IpcResult = { status: "success", data: undefined };

function failed(reason: string, details?: string): IpcResult {
    log.error(`${reason}${details ? `: ${details}` : ""}`);

    return { status: "failed", reason, details };
}

async function attempt(reason: string, action: () => Promise<void> | void): Promise<IpcResult> {
    try {
        await action();

        return success;
    } catch (err) {
        return failed(reason, err instanceof Error ? err.message : String(err));
    }
}

// openPath resolves with an error message rather than rejecting, and an empty string on success.
async function openPath(target: string): Promise<IpcResult> {
    return attempt("open_failed", async () => {
        const error = await shell.openPath(target);
        if (error) throw new Error(error);
    });
}

// showItemInFolder reports nothing at all, so a missing file is otherwise indistinguishable from success.
async function showInFolder(target: string): Promise<IpcResult> {
    return attempt("open_failed", async () => {
        await fs.promises.access(target);
        shell.showItemInFolder(target);
    });
}

// Careful with shell.openExternal. https://benjamin-altpeter.de/shell-openexternal-dangers/
function isAllowedUrl(url: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }
    if (!["https:", "http:"].includes(parsed.protocol)) return false;

    return configService.getConfig().allowedUrlLinks.some((serviceUrl) => url.startsWith(serviceUrl));
}

async function openInBrowser(url: string): Promise<IpcResult> {
    if (!isAllowedUrl(url)) return failed("url_not_allowed", url);

    return attempt("open_failed", () => shell.openExternal(url));
}

function registerIpcHandlers() {
    ipcMain.handle("shell:openStateDir", () => openPath(STATE_PATH));
    ipcMain.handle("shell:openAssetsDir", () => openPath(getAssetsPath()));
    ipcMain.handle("shell:openSettingsFile", () => openPath(path.join(CONFIG_PATH, "settings.json")));
    ipcMain.handle("shell:openStartScript", () => openPath(path.join(WRITE_DATA_PATH, "script.txt")));
    ipcMain.handle("shell:openReplaysDir", () => openPath(REPLAYS_PATH));
    ipcMain.handle("shell:showReplayInFolder", (_event, fileName: string) => showInFolder(path.join(REPLAYS_PATH, fileName)));

    // External
    ipcMain.handle("shell:openInBrowser", (_event, url) => openInBrowser(url));
}

export const shellService = {
    registerIpcHandlers,
};
