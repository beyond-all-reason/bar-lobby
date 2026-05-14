import { dialog } from "electron";
import { setAssetsPath, getAssetsPath, STATE_PATH } from "@main/config/app";
import { settingsService } from "./settings.service";
import engineService from "./engine.service";
import mapsService from "./maps.service";
import gameService from "./game.service";
import { ipcMain, BarIpcWebContents } from "@main/typed-ipc";
import fs from "fs";
import path from "path";

async function countFiles(dir: string): Promise<number> {
    let count = 0;
    try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                count += await countFiles(path.join(dir, entry.name));
            } else {
                count++;
            }
        }
    } catch {
        // skip unreadable entries
    }
    return count;
}

async function copyWithProgress(src: string, dest: string, onProgress: (copied: number, total: number) => void): Promise<void> {
    const total = await countFiles(src);
    let copied = 0;

    async function copyDir(srcDir: string, destDir: string) {
        await fs.promises.mkdir(destDir, { recursive: true });
        const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);
            if (entry.isDirectory()) {
                await copyDir(srcPath, destPath);
            } else {
                await fs.promises.copyFile(srcPath, destPath);
                copied++;
                onProgress(copied, total);
            }
        }
    }

    await copyDir(src, dest);
}

function validateAssetsPath(newPath: string): string | null {
    const resolved = path.resolve(newPath);
    const resolvedState = path.resolve(STATE_PATH);
    if (resolved.startsWith(resolvedState + path.sep) || resolved === resolvedState) {
        return "Assets path cannot be inside the state directory.";
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
