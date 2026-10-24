// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { getContentRoots, SAVES_PATH } from "@main/config/app";
import * as saves from "@main/content/singleplayer/saves";
import { loadSingleplayerContent } from "@main/content/singleplayer/singleplayer-loader";
import { ipcMain } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import type { SaveChange, SavedResult } from "@shared/content/save";
import { Signal } from "$/jaz-ts-utils/signal";
import type { WebContents } from "electron";
import { ContentProblem, ContentSource, isSameItem, SingleplayerContent, SingleplayerItemRef, SingleplayerKind } from "@shared/content/singleplayer";

const log = logger("singleplayer.service.ts");

// Raised after every change to a save, whatever made it. Telling the renderer is one subscriber, so whatever
// shows saved progress stays current even when the change came from main, such as a finished game.
const onSaveChanged = new Signal<SaveChange>();

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

const itemOf = (kind: SingleplayerKind, { source, rootId, id }: SingleplayerItemRef) => ({ kind, source, rootId, id });

async function recordResult(kind: SingleplayerKind, ref: SingleplayerItemRef, result: SavedResult) {
    const save = await saves.recordResult(SAVES_PATH, kind, ref, result);
    onSaveChanged.dispatch({ item: itemOf(kind, ref), save });

    return save;
}

async function deleteSave(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    await saves.deleteSave(SAVES_PATH, kind, ref);
    onSaveChanged.dispatch({ item: itemOf(kind, ref), save: undefined });
}

// Every singleplayer save, for the settings menu. The player has confirmed it there.
async function deleteAllSaves() {
    for (const item of await saves.deleteAllSaves(SAVES_PATH)) {
        onSaveChanged.dispatch({ item, save: undefined });
    }
}

function registerIpcHandlers(webContents: WebContents) {
    ipcMain.handle("singleplayer:list", () => scan());
    ipcMain.handle("singleplayer:getCampaign", (_, source: ContentSource, rootId: string, id: string) => get("campaigns", { source, rootId, id }));
    ipcMain.handle("singleplayer:getScenario", (_, source: ContentSource, rootId: string, id: string) => get("scenarios", { source, rootId, id }));
    ipcMain.handle("singleplayer:getTutorial", (_, source: ContentSource, rootId: string, id: string) => get("tutorials", { source, rootId, id }));
    ipcMain.handle("singleplayer:getSaves", () => getSaves());
    ipcMain.handle("singleplayer:recordResult", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string, result: SavedResult) =>
        recordResult(kind, { source, rootId, id }, result)
    );
    ipcMain.handle("singleplayer:deleteSave", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string) => deleteSave(kind, { source, rootId, id }));
    ipcMain.handle("singleplayer:deleteAllSaves", () => deleteAllSaves());

    onSaveChanged.add((change) => webContents.send("singleplayer:saveChanged", change));
}

export const singleplayerService = {
    registerIpcHandlers,
    readSave,
    recordResult,
    onSaveChanged,
};
