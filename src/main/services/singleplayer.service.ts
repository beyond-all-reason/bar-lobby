// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { getContentRoots, SAVES_PATH } from "@main/config/app";
import * as saves from "@main/content/singleplayer/saves";
import { loadSingleplayerContent } from "@main/content/singleplayer/singleplayer-loader";
import { ipcMain } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import type { SavedResult } from "@shared/content/save";
import { ContentProblem, ContentSource, isSameItem, SingleplayerContent, SingleplayerItemRef, SingleplayerKind } from "@shared/content/singleplayer";

const log = logger("singleplayer.service.ts");

// Content is scanned when asked for, not watched: the depot only changes through Steam while the client is
// closed. Something that adds content while running can ask for a rescan through singleplayer:list.
let lastScan: Promise<SingleplayerContent> | undefined;

function logProblems(problems: readonly ContentProblem[]) {
    for (const problem of problems) {
        log[problem.severity === "error" ? "error" : "warn"](`${problem.path}: ${problem.message}`);
    }
}

function scan() {
    lastScan = loadSingleplayerContent(getContentRoots()).then((content) => {
        logProblems(content.problems);
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

async function getSaves() {
    const read = await saves.readSaves(SAVES_PATH);
    logProblems(read.problems);

    return read;
}

// Saved progress, for whatever reports a finished game and for launching a mission with its saved variables.
function readSave(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    return saves.readSave(SAVES_PATH, kind, ref);
}

function recordResult(kind: SingleplayerKind, ref: SingleplayerItemRef, result: SavedResult) {
    return saves.recordResult(SAVES_PATH, kind, ref, result);
}

function deleteSave(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    return saves.deleteSave(SAVES_PATH, kind, ref);
}

function registerIpcHandlers() {
    ipcMain.handle("singleplayer:list", () => scan());
    ipcMain.handle("singleplayer:getCampaign", (_, source: ContentSource, rootId: string, id: string) => get("campaigns", { source, rootId, id }));
    ipcMain.handle("singleplayer:getScenario", (_, source: ContentSource, rootId: string, id: string) => get("scenarios", { source, rootId, id }));
    ipcMain.handle("singleplayer:getTutorial", (_, source: ContentSource, rootId: string, id: string) => get("tutorials", { source, rootId, id }));
    ipcMain.handle("singleplayer:getSaves", () => getSaves());
    ipcMain.handle("singleplayer:recordResult", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string, result: SavedResult) =>
        recordResult(kind, { source, rootId, id }, result)
    );
    ipcMain.handle("singleplayer:deleteSave", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string) => deleteSave(kind, { source, rootId, id }));
}

export const singleplayerService = {
    registerIpcHandlers,
    readSave,
    recordResult,
};
