// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { getContentRoots } from "@main/config/app";
import { loadSingleplayerContent } from "@main/content/singleplayer/singleplayer-loader";
import { ipcMain } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { ContentSource, isSameItem, SingleplayerContent, SingleplayerItemRef } from "@shared/content/singleplayer";

const log = logger("singleplayer.service.ts");

// Content is scanned when asked for, not watched: the depot only changes through Steam while the client is
// closed. Something that adds content while running can ask for a rescan through singleplayer:list.
let lastScan: Promise<SingleplayerContent> | undefined;

function scan() {
    lastScan = loadSingleplayerContent(getContentRoots()).then((content) => {
        for (const problem of content.problems) {
            log[problem.severity === "error" ? "error" : "warn"](`${problem.path}: ${problem.message}`);
        }
        return content;
    });

    return lastScan;
}

function scanned() {
    return lastScan ?? scan();
}

async function get<K extends "campaigns" | "scenarios" | "tutorials">(kind: K, ref: SingleplayerItemRef): Promise<SingleplayerContent[K][number] | undefined> {
    return (await scanned())[kind].find((item) => isSameItem(item, ref));
}

function registerIpcHandlers() {
    ipcMain.handle("singleplayer:list", () => scan());
    ipcMain.handle("singleplayer:getCampaign", (_, source: ContentSource, rootId: string, id: string) => get("campaigns", { source, rootId, id }));
    ipcMain.handle("singleplayer:getScenario", (_, source: ContentSource, rootId: string, id: string) => get("scenarios", { source, rootId, id }));
    ipcMain.handle("singleplayer:getTutorial", (_, source: ContentSource, rootId: string, id: string) => get("tutorials", { source, rootId, id }));
}

export const singleplayerService = {
    registerIpcHandlers,
};
