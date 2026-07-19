// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "fs";
import path from "path";
import type { BrowserWindow } from "electron";

import { replayContentAPI } from "@main/content/replays/replay-content";
import { BarIpcWebContents } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";

export type NavigationTarget = string;

type ReplayRequest = {
    argv: string[];
    workingDirectory: string;
};

const pendingReplayRequests: ReplayRequest[] = [];
const openingReplayFiles = new Set<string>();

let mainWindow: BrowserWindow | undefined;
let webContents: BarIpcWebContents | undefined;
let rendererReady = false;

const log = logger("navigation.service.ts");

function navigateTo(contents: BarIpcWebContents, target: NavigationTarget) {
    contents.send("navigation:navigateTo", target);
}

function registerIpcHandlers(window: BrowserWindow, contents: BarIpcWebContents) {
    mainWindow = window;
    webContents = contents;

    contents.ipc.handle("renderer:ready", () => {
        log.info("Renderer is ready!");
        rendererReady = true;
        flushReplayRequests();
    });
}

function enqueueReplayRequest(argv: string[], workingDirectory: string) {
    pendingReplayRequests.push({ argv, workingDirectory });
    flushReplayRequests();
}

function handleSecondInstance(argv: string[], workingDirectory: string) {
    log.info("Second instance detected. Focusing the main window.");

    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
    }

    enqueueReplayRequest(argv, workingDirectory);
}

function flushReplayRequests() {
    if (!rendererReady || !webContents || pendingReplayRequests.length === 0) {
        return;
    }

    const requests = pendingReplayRequests.splice(0);
    const replayFiles = new Set<string>();

    for (const request of requests) {
        for (const replayFile of getReplayFiles(request.argv, request.workingDirectory, webContents)) {
            replayFiles.add(replayFile);
        }
    }

    if (replayFiles.size > 0) {
        const files = [...replayFiles];
        log.info(`Replay files opened with the app: ${files}`);
        openReplays(files, webContents);
    }
}

function openReplays(replayFiles: string[], contents: BarIpcWebContents) {
    const replayFileNames: string[] = [];

    for (const filePath of replayFiles) {
        if (openingReplayFiles.has(filePath)) {
            continue;
        }

        openingReplayFiles.add(filePath);
        const fileName = path.basename(filePath);
        replayFileNames.push(fileName);
        replayContentAPI
            .copyParseReplay(filePath)
            .catch((err) => {
                log.error(`Failed to copy and parse replay file ${filePath}:`, err);
                contents.send("notifications:showAlert", {
                    text: `Failed to open replay file: ${fileName}`,
                    severity: "error",
                });
            })
            .finally(() => {
                openingReplayFiles.delete(filePath);
            });
    }

    if (replayFileNames.length === 0) {
        return;
    }

    navigateTo(contents, "/watch/replays");
    contents.send("replays:highlightOpened", replayFileNames);
}

function getReplayFiles(argv: string[], workingDirectory: string, contents: BarIpcWebContents): string[] {
    return argv
        .filter((arg) => path.extname(arg).toLowerCase() === ".sdfz")
        .map((arg) => {
            const filePath = path.resolve(workingDirectory, arg);
            if (fs.existsSync(filePath)) {
                return filePath;
            }

            log.warn(`Replay file not found: ${filePath}`);
            contents.send("notifications:showAlert", {
                text: `Replay file not found: ${path.basename(filePath)}`,
                severity: "error",
            });
            return null;
        })
        .filter((file): file is string => file !== null);
}

export const navigationService = {
    navigateTo,
    registerIpcHandlers,
    enqueueReplayRequest,
    handleSecondInstance,
};
