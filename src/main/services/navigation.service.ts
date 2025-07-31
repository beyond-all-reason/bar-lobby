// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT
import { app, BrowserWindow } from "electron";
import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { replayContentAPI } from "@main/content/replays/replay-content";
import { typedWebContents } from "@main/typed-ipc";

import fs from "fs";
import path from "path";

export type NavigationTarget = string;
const log = logger("navigation.service.ts");

function navigateTo(webContents: BarIpcWebContents, target: NavigationTarget) {
    webContents.send("navigation:navigateTo", target);
}

function registerIpcHandlers(webContents: BarIpcWebContents) {
    webContents.ipc.handle("renderer:ready", () => {
        log.info("Renderer is ready!");

        const replayFiles = getReplayFiles(process.argv, process.cwd(), webContents);
        if (replayFiles.length > 0) {
            log.info(`Replay files opened on startup: ${replayFiles}`);
            openReplays(replayFiles, typedWebContents(webContents));
        }
    });

    app.on("second-instance", (_event, argv, workingDirectory) => {
        log.info("Second instance detected. Focusing the main window.");
        // If someone tries to open a second instance, focus the main window
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
        }

        // Handle replay files opened with the app
        const replayFiles = getReplayFiles(argv, workingDirectory, typedWebContents(mainWindow.webContents));
        if (replayFiles.length > 0) {
            log.info(`Replay files opened with the app: ${replayFiles}`);
            openReplays(replayFiles, typedWebContents(mainWindow.webContents));
        }
    });
}

function openReplays(replayFiles: string[], webContents: BarIpcWebContents) {
    const replayFileNames: string[] = [];
    for (const filePath of replayFiles) {
        const fileName = path.basename(filePath);
        replayFileNames.push(fileName);
        replayContentAPI.copyParseReplay(filePath).catch((err) => {
            log.error(`Failed to copy and parse replay file ${filePath}:`, err);
            webContents.send("notifications:showAlert", {
                text: `Failed to open replay file: ${fileName}`,
                severity: "error",
            });
        });
    }
    navigationService.navigateTo(webContents, "/watch/replays");
    // Send event to highlight the opened replays
    webContents.send("replays:highlightOpened", replayFileNames);
}

function getReplayFiles(argv: string[], workingDirectory: string, webContents: BarIpcWebContents): string[] {
    return argv
        .filter((arg) => arg.endsWith(".sdfz"))
        .map((arg) => {
            const filePath = path.resolve(workingDirectory, arg);
            if (fs.existsSync(filePath)) {
                return filePath;
            } else {
                log.warn(`Replay file not found: ${filePath}`);
                webContents.send("notifications:showAlert", {
                    text: `Replay file not found: ${path.basename(filePath)}`,
                    severity: "error",
                });
                return null;
            }
        })
        .filter((file) => file !== null);
}

export const navigationService = {
    navigateTo: (webContents: BarIpcWebContents, target: NavigationTarget) => navigateTo(webContents, target),
    registerIpcHandlers: (webContents: BarIpcWebContents) => registerIpcHandlers(webContents),
};
