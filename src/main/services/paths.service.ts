// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { dialog } from "electron";
import { setAssetsPath, getAssetsPath, STATE_PATH } from "@main/config/app";
import { settingsService } from "./settings.service";
import engineService from "./engine.service";
import mapsService from "./maps.service";
import gameService from "./game.service";
import { ipcMain, BarIpcWebContents } from "@main/typed-ipc";
import fs from "fs";
import path from "path";
import { logger } from "@main/utils/logger";

const log = logger("paths.service.ts");

async function copyWithProgress(src: string, dest: string, onProgress: (copied: number, total: number) => void): Promise<void> {
    let copied = 0;
    let total = 0;

    async function discover(dir: string) {
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.isSymbolicLink()) {
                    await discover(path.join(dir, entry.name));
                } else {
                    total++;
                }
            }
        } catch {
            // skip unreadable entries
        }
    }

    async function copyDir(srcDir: string, destDir: string) {
        await fs.promises.mkdir(destDir, { recursive: true });
        const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);
            if (entry.isSymbolicLink()) {
                const linkTarget = await fs.promises.readlink(srcPath);
                await fs.promises.symlink(linkTarget, destPath);
                copied++;
                onProgress(copied, total);
            } else if (entry.isDirectory()) {
                await copyDir(srcPath, destPath);
            } else {
                await fs.promises.copyFile(srcPath, destPath);
                copied++;
                onProgress(copied, total);
            }
        }
    }

    await discover(src);
    await copyDir(src, dest);
}

function validateAssetsPath(newPath: string): string | null {
    if (!newPath || newPath.trim() === "") {
        return "Path must not be empty.";
    }
    const resolved = path.resolve(newPath);
    const resolvedState = path.resolve(STATE_PATH);
    if (resolved === resolvedState || resolved.startsWith(resolvedState + path.sep)) {
        return "Assets path cannot be inside the state directory.";
    }
    const resolvedCurrent = path.resolve(getAssetsPath());
    if (resolved.startsWith(resolvedCurrent + path.sep)) {
        return "New path cannot be inside the current assets directory.";
    }
    if (resolvedCurrent.startsWith(resolved + path.sep)) {
        return "Current assets path cannot be inside the new path.";
    }
    return null;
}

async function applyNewPath(newAssetsPath: string) {
    const error = validateAssetsPath(newAssetsPath);
    if (error) {
        throw new Error(error);
    }
    await settingsService.updateSettings({ assetsPath: newAssetsPath });
    setAssetsPath(newAssetsPath);
    await engineService.reinit();
    await mapsService.reinit();
    await gameService.reinit();
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    ipcMain.handle("paths:selectFolder", async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            defaultPath: getAssetsPath(),
            properties: ["openDirectory"],
        });
        return canceled ? null : filePaths[0];
    });

    ipcMain.handle("paths:moveAndChangePath", async (_, newAssetsPath: string) => {
        const oldAssetsPath = getAssetsPath();
        await copyWithProgress(oldAssetsPath, newAssetsPath, (copied, total) => {
            webContents.send("paths:copyProgress", { copied, total });
        });
        await applyNewPath(newAssetsPath);
        const rootDir = path.parse(oldAssetsPath).root;
        if (oldAssetsPath === rootDir || oldAssetsPath === path.dirname(rootDir)) {
            log.warn(`Refusing to delete suspicious path: ${oldAssetsPath}`);
            return;
        }
        await fs.promises.rm(oldAssetsPath, { recursive: true, force: true });
    });

    ipcMain.handle("paths:copyAndChangePath", async (_, newAssetsPath: string) => {
        await copyWithProgress(getAssetsPath(), newAssetsPath, (copied, total) => {
            webContents.send("paths:copyProgress", { copied, total });
        });
        await applyNewPath(newAssetsPath);
    });

    ipcMain.handle("paths:changePath", async (_, newAssetsPath: string) => {
        await applyNewPath(newAssetsPath);
    });

    ipcMain.handle("paths:getCurrentAssetsPath", () => getAssetsPath());
}

export const pathsService = { registerIpcHandlers };
