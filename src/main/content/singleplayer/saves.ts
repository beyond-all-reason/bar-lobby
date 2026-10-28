// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { type AppliedProgress, countPlay, type ItemProgress } from "../../../shared/content/campaign-progress";
import { ReportedResult, SAVE_FORMAT_VERSION, SAVE_LIMITS, saveCompatibility, saveKey, type SaveFailure, SingleplayerSave } from "../../../shared/content/save";
import type { ContentProblem, SingleplayerItemRef, SingleplayerKind } from "../../../shared/content/singleplayer";
import { describeError, relevantErrors } from "./files";

// A change to a save that was refused, with the code the renderer words it by. The message is for the log.
export class SaveFailureError extends Error {
    readonly reason: SaveFailure;

    constructor(reason: SaveFailure, message: string) {
        super(message);
        this.name = "SaveFailureError";
        this.reason = reason;
    }
}

// Saves are read exactly as written, as content is. One written by another client version must not be
// changed by reading it.
const ajv = new Ajv2020({ strict: true, allErrors: true, verbose: true });
const validateSave = ajv.compile(SingleplayerSave);
const validateResult = ajv.compile(ReportedResult);

/**
 * The file a save is kept in. Ids come from content and may hold any character a folder name can, or differ
 * only in case, so the name is a hash of the save's key: the same on every file system and machine, and
 * never shared by two items. The item inside the file says what it belongs to.
 */
export function saveFileName(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    return `${kind}-${crypto.createHash("sha256").update(saveKey(kind, ref)).digest("hex").slice(0, 32)}.json`;
}

type SaveItem = SingleplayerSave["item"];

type ReadSave = { save: SingleplayerSave } | { missing: true } | { problem: string };

async function readSaveFile(filePath: string): Promise<ReadSave> {
    let text: string;
    try {
        text = await fs.readFile(filePath, "utf8");
    } catch (err) {
        return (err as NodeJS.ErrnoException).code === "ENOENT" ? { missing: true } : { problem: "Cannot be read" };
    }

    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch (err) {
        return { problem: `Not valid JSON: ${err instanceof Error ? err.message : String(err)}` };
    }

    const formatVersion = (value as { formatVersion?: unknown } | null)?.formatVersion;
    if (typeof formatVersion === "number" && formatVersion > SAVE_FORMAT_VERSION) {
        return { problem: `Saved by a newer client: format version ${formatVersion}, and this client supports up to ${SAVE_FORMAT_VERSION}` };
    }
    if (!validateSave(value)) {
        return {
            problem: relevantErrors(validateSave.errors ?? [])
                .map(describeError)
                .join("; "),
        };
    }

    const save = value as SingleplayerSave;
    if (saveFileName(save.item.kind, save.item) !== path.basename(filePath)) {
        return { problem: `Holds the save of ${saveKey(save.item.kind, save.item)}, which belongs in another file` };
    }

    return { save };
}

/**
 * Every save in the folder. A file this client can't use is reported and left as it is: it may be half
 * synced, or written by a newer client on another machine, and only deleting the save replaces it.
 */
export async function readSaves(dir: string): Promise<{ saves: SingleplayerSave[]; problems: ContentProblem[] }> {
    let names: string[];
    try {
        names = await fs.readdir(dir);
    } catch {
        return { saves: [], problems: [] };
    }

    const saves: SingleplayerSave[] = [];
    const problems: ContentProblem[] = [];
    for (const name of names.filter((name) => name.endsWith(".json") && !name.startsWith(".")).sort()) {
        const filePath = path.join(dir, name);
        const read = await readSaveFile(filePath);
        if ("save" in read) {
            saves.push(read.save);
        } else if ("problem" in read) {
            problems.push({ path: filePath, severity: "error", message: read.problem });
        }
    }

    return { saves, problems };
}

// One item's save, or undefined if it has never been played. Throws if the save can't be used.
export async function readSave(dir: string, kind: SingleplayerKind, ref: SingleplayerItemRef): Promise<SingleplayerSave | undefined> {
    const filePath = path.join(dir, saveFileName(kind, ref));
    const read = await readSaveFile(filePath);
    if ("problem" in read) {
        throw new Error(`${filePath}: ${read.problem}`);
    }

    return "save" in read ? read.save : undefined;
}

// Changes to one file run one after another, so two results recorded close together both land, in order.
const queues = new Map<string, Promise<unknown>>();

function queued<T>(filePath: string, task: () => Promise<T>): Promise<T> {
    const run = (queues.get(filePath) ?? Promise.resolve()).then(task);
    const settled = run.catch(() => {});
    queues.set(filePath, settled);
    settled.then(() => {
        if (queues.get(filePath) === settled) {
            queues.delete(filePath);
        }
    });

    return run;
}

// Without the values, which may be long: a result comes from a mission, not from a file someone can open.
function checkResult(result: ReportedResult) {
    if (!validateResult(result)) {
        throw new SaveFailureError("invalid_result", `Invalid result: ${(validateResult.errors ?? []).map((error) => `${error.instancePath || "(root)"} ${error.message}`).join("; ")}`);
    }
}

// How a result changes an item's progress. Without unlock rules, a scenario or tutorial only counts the play.
export type ApplyResult = (progress: ItemProgress, result: ReportedResult) => AppliedProgress;

const countOnly: ApplyResult = (progress, result) => ({ plays: countPlay(progress.plays, result.missionId, result.outcome) });

/**
 * Applies a played result to an item's save, creating the save on its first result, and returns the save as
 * written. `saveVersion` is the content's, which a new save records, and `apply` is how the result changes the
 * item's progress. Refuses, and leaves the file alone, if the existing save can't be used or was started under
 * another save version, or if the result would leave the save over its limits.
 */
export async function recordResult(dir: string, kind: SingleplayerKind, ref: SingleplayerItemRef, result: ReportedResult, saveVersion = 1, apply: ApplyResult = countOnly): Promise<SingleplayerSave> {
    checkResult(result);
    const filePath = path.join(dir, saveFileName(kind, ref));

    return queued(filePath, async () => {
        const read = await readSaveFile(filePath);
        if ("problem" in read) {
            throw new SaveFailureError("save_unusable", `${filePath}: ${read.problem}. Delete the save to start over.`);
        }

        const save: SingleplayerSave =
            "save" in read ? read.save : { formatVersion: SAVE_FORMAT_VERSION, saveVersion, item: { kind, source: ref.source, rootId: ref.rootId, id: ref.id }, plays: {}, recent: [] };
        const compatibility = saveCompatibility(save, saveVersion);
        if (compatibility !== "compatible") {
            throw compatibility === "older"
                ? new SaveFailureError("save_version_older", `${filePath}: Started under save version ${save.saveVersion ?? 1} of this content, which is now at ${saveVersion}. Start over to play it.`)
                : new SaveFailureError("save_version_newer", `${filePath}: Started under save version ${save.saveVersion ?? 1} of this content, newer than the ${saveVersion} installed.`);
        }

        const progress = apply(save, result);
        const variableCount = Object.keys(progress.campaign?.variables ?? {}).length;
        if (variableCount > SAVE_LIMITS.variableCount) {
            throw new SaveFailureError("invalid_result", `Invalid result: ${variableCount} variables saved, more than the ${SAVE_LIMITS.variableCount} allowed`);
        }

        const recent = [...save.recent, { ...result, at: new Date().toISOString() }].slice(-SAVE_LIMITS.recentResults);
        const updated: SingleplayerSave = { ...save, ...progress, recent };
        await writeSave(filePath, updated);

        return updated;
    });
}

// Through a temp file, so a crash mid-write can't truncate the save. The temp file doesn't end in .json, so
// neither this folder's readers nor a cloud sync pattern pick it up.
async function writeSave(filePath: string, save: SingleplayerSave) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(save, null, 4));
    await fs.rename(tempPath, filePath);
}

// Deletes an item's save, whatever state it is in. Deleting a save that doesn't exist does nothing.
export function deleteSave(dir: string, kind: SingleplayerKind, ref: SingleplayerItemRef): Promise<void> {
    const filePath = path.join(dir, saveFileName(kind, ref));

    return queued(filePath, () => fs.rm(filePath, { force: true }));
}

/**
 * Deletes every save in the folder, unreadable ones included, and leftover temp files with them. Calls onDeleted
 * with the item of each readable save as soon as it is gone, so whoever shows them is told even if a later delete
 * throws. Anything else in the folder is left.
 */
export async function deleteAllSaves(dir: string, onDeleted: (item: SaveItem) => void): Promise<void> {
    let names: string[];
    try {
        names = await fs.readdir(dir);
    } catch {
        return;
    }

    for (const name of names.filter((name) => name.endsWith(".json") || name.endsWith(".json.tmp"))) {
        const filePath = path.join(dir, name);
        await queued(filePath, async () => {
            const read = await readSaveFile(filePath);
            await fs.rm(filePath, { force: true });
            if ("save" in read) {
                onDeleted(read.save.item);
            }
        });
    }
}
