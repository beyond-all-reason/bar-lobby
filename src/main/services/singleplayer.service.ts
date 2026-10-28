// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "node:path";
import { getContentRoots, SAVES_PATH } from "@main/config/app";
import * as saves from "@main/content/singleplayer/saves";
import { SaveFailureError } from "@main/content/singleplayer/saves";
import { loadSingleplayerContent } from "@main/content/singleplayer/singleplayer-loader";
import { settingsService } from "@main/services/settings.service";
import { ipcMain, IpcResult } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { applyResult } from "@shared/content/campaign-progress";
import type { ReportedResult, SaveChange, SaveFailure, SingleplayerSaves } from "@shared/content/save";
import { Signal } from "$/jaz-ts-utils/signal";
import type { WebContents } from "electron";
import { ContentProblem, ContentSource, isSameItem, SingleplayerContent, SingleplayerItemRef, SingleplayerKind, SingleplayerLoadFailure } from "@shared/content/singleplayer";

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

// Dev mode is read on each scan, and the renderer rescans whenever it lists content, so turning it on or off
// shows or hides dev content the next time a list is opened.
function scan() {
    lastScan = loadSingleplayerContent(getContentRoots(), { devContent: settingsService.getSettings().devMode }).then((content) => {
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

const itemOf = (kind: SingleplayerKind, { source, rootId, id }: SingleplayerItemRef) => ({ kind, source, rootId, id });

const KINDS = ["campaign", "scenario", "tutorial"] as const satisfies SingleplayerKind[];

// A save that can't be used says nothing reliable about whose it is, so it is matched to an item by the file
// that item's save would be kept in. One whose item isn't installed is only logged, as there is nothing to show it on.
async function getSaves(): Promise<SingleplayerSaves> {
    const [read, content] = await Promise.all([saves.readSaves(SAVES_PATH), scanned().catch(() => undefined)]);
    logProblems(read.problems);

    const unusableFiles = new Set(read.problems.map((problem) => path.basename(problem.path)));
    const unusable = KINDS.flatMap((kind) => (content?.[`${kind}s`] ?? []).filter((item) => unusableFiles.has(saves.saveFileName(kind, item))).map((item) => itemOf(kind, item)));

    return { saves: read.saves, unusable };
}

// Saved progress, for whatever reports a finished game and for launching a mission with its saved variables.
// A campaign's save is only usable while saveCompatibility with the campaign's saveVersion says so: launching
// must check that, then pass on campaignVariables(save).
function readSave(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    return saves.readSave(SAVES_PATH, kind, ref);
}

// The kind comes over IPC, so it is checked rather than trusted.
function checkKind(kind: string) {
    if (!(KINDS as readonly string[]).includes(kind)) {
        throw new SaveFailureError("unknown_item", `Unknown singleplayer kind ${JSON.stringify(kind)}. Expected one of ${KINDS.join(", ")}`);
    }
}

// A result applies under the item's rules as main last scanned them, not as the renderer has them.
async function recordResult(kind: SingleplayerKind, ref: SingleplayerItemRef, result: ReportedResult) {
    checkKind(kind);
    const item = await get(`${kind}s`, ref);
    if (!item) {
        throw new SaveFailureError("unknown_item", `No ${kind} ${ref.id} in ${ref.source}/${ref.rootId}`);
    }
    // A scenario or tutorial is one mission, and its plays are read under its own id.
    if (item.kind !== "campaign" && result.missionId !== item.id) {
        throw new SaveFailureError("invalid_result", `A result for ${kind} ${item.id} names mission ${result.missionId}`);
    }

    const save =
        item.kind === "campaign"
            ? await saves.recordResult(SAVES_PATH, kind, ref, result, item.config.saveVersion ?? 1, (progress, reported) => applyResult(item.config, progress, reported))
            : await saves.recordResult(SAVES_PATH, kind, ref, result);
    onSaveChanged.dispatch({ item: itemOf(kind, ref), save });

    return save;
}

async function deleteSave(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    checkKind(kind);
    await saves.deleteSave(SAVES_PATH, kind, ref);
    onSaveChanged.dispatch({ item: itemOf(kind, ref), save: undefined });
}

// Every singleplayer save, for the settings menu. The player has confirmed it there.
async function deleteAllSaves() {
    await saves.deleteAllSaves(SAVES_PATH, (item) => onSaveChanged.dispatch({ item, save: undefined }));
}

// A call over IPC gives the renderer the reason it failed as a code to word, since a thrown error would reach
// it as its message alone. What is behind the code goes to the log.
async function overIpc<T>(action: () => Promise<T>, reasonOf: (err: unknown) => string): Promise<IpcResult<T>> {
    try {
        return { status: "success", data: await action() };
    } catch (err) {
        const reason = reasonOf(err);
        const details = err instanceof Error ? err.message : String(err);
        log.error(`${reason}: ${details}`);

        return { status: "failed", reason, details };
    }
}

const saveFailureOf = (err: unknown): SaveFailure => (err instanceof SaveFailureError ? err.reason : "save_failed");
const loadFailureOf = (): SingleplayerLoadFailure => "load_failed";

function registerIpcHandlers(webContents: WebContents) {
    ipcMain.handle("singleplayer:list", () => overIpc(scan, loadFailureOf));
    ipcMain.handle("singleplayer:getSaves", () => overIpc(getSaves, loadFailureOf));
    ipcMain.handle("singleplayer:recordResult", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string, result: ReportedResult) =>
        overIpc(() => recordResult(kind, { source, rootId, id }, result), saveFailureOf)
    );
    ipcMain.handle("singleplayer:deleteSave", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string) => overIpc(() => deleteSave(kind, { source, rootId, id }), saveFailureOf));
    ipcMain.handle("singleplayer:deleteAllSaves", () => overIpc(deleteAllSaves, saveFailureOf));

    onSaveChanged.add((change) => webContents.send("singleplayer:saveChanged", change));
}

export const singleplayerService = {
    registerIpcHandlers,
    readSave,
    recordResult,
    onSaveChanged,
};
