// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import type { ContentProblem, SingleplayerItemRef, SingleplayerKind } from "@shared/content/singleplayer";
import { SUSPENDED_FORMAT_VERSION, SuspendedMissionFile } from "@shared/content/suspended-mission";
import { readEngineSaveHeader, savedMission } from "./engine-save";
import { describeError, relevantErrors } from "./files";
import { saveFileName } from "./saves";
import { queued } from "../../utils/file-queue";
import { logger } from "../../utils/logger";

const log = logger("suspended-missions.ts");

const ajv = new Ajv2020({ strict: true, allErrors: true, verbose: true });
const validateFile = ajv.compile(SuspendedMissionFile);

// Named as the item's progress save is, so the two can be told apart only by folder: <kind>-<hash>.json beside <kind>-<hash>.ssf.
function filesOf(dir: string, kind: SingleplayerKind, ref: SingleplayerItemRef) {
    const json = path.join(dir, saveFileName(kind, ref));

    return { json, ssf: json.replace(/\.json$/, ".ssf") };
}

// The engine save an item's suspended mission is loaded from.
export function suspendedSavePath(dir: string, kind: SingleplayerKind, ref: SingleplayerItemRef) {
    return filesOf(dir, kind, ref).ssf;
}

type Read = { file: SuspendedMissionFile } | { missing: true } | { problem: string };

async function readFile(jsonPath: string): Promise<Read> {
    let text: string;
    try {
        text = await fs.readFile(jsonPath, "utf8");
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
    if (typeof formatVersion === "number" && formatVersion > SUSPENDED_FORMAT_VERSION) {
        return { problem: `Written by a newer client: format version ${formatVersion}, and this client supports up to ${SUSPENDED_FORMAT_VERSION}` };
    }
    if (!validateFile(value)) {
        return {
            problem: relevantErrors(validateFile.errors ?? [])
                .map(describeError)
                .join("; "),
        };
    }

    const file = value as SuspendedMissionFile;
    if (saveFileName(file.item.kind, file.item) !== path.basename(jsonPath)) {
        return { problem: "Holds another item's suspended mission" };
    }
    try {
        await fs.access(jsonPath.replace(/\.json$/, ".ssf"));
    } catch {
        return { problem: "Its engine save is missing" };
    }

    return { file };
}

/**
 * Every suspended mission in the folder. One that can't be used is reported and otherwise ignored: playing its
 * item from the start replaces it.
 */
export async function readSuspendedMissions(dir: string): Promise<{ files: SuspendedMissionFile[]; problems: ContentProblem[] }> {
    let names: string[];
    try {
        names = await fs.readdir(dir);
    } catch {
        return { files: [], problems: [] };
    }

    const files: SuspendedMissionFile[] = [];
    const problems: ContentProblem[] = [];
    for (const name of names.filter((name) => name.endsWith(".json") && !name.startsWith(".")).sort()) {
        const jsonPath = path.join(dir, name);
        const read = await readFile(jsonPath);
        if ("file" in read) {
            files.push(read.file);
        } else if ("problem" in read) {
            problems.push({ path: jsonPath, severity: "error", message: read.problem });
        }
    }

    return { files, problems };
}

// An item's suspended mission, or undefined if it has none it can use.
export async function readSuspendedMission(dir: string, kind: SingleplayerKind, ref: SingleplayerItemRef): Promise<SuspendedMissionFile | undefined> {
    const { json } = filesOf(dir, kind, ref);
    const read = await readFile(json);
    if ("problem" in read) {
        log.warn(`${json}: ${read.problem}`);
    }

    return "file" in read ? read.file : undefined;
}

// Deletes an item's suspended mission, whatever state it is in. Gives whether there was anything to delete.
export function deleteSuspendedMission(dir: string, kind: SingleplayerKind, ref: SingleplayerItemRef): Promise<boolean> {
    const { json, ssf } = filesOf(dir, kind, ref);

    return queued(json, async () => {
        const existed = (
            await Promise.all(
                [json, ssf].map((file) =>
                    fs.stat(file).then(
                        () => true,
                        () => false
                    )
                )
            )
        ).some(Boolean);
        // The description goes first, so an interrupted delete leaves an engine save nothing lists rather than the reverse.
        await fs.rm(json, { force: true });
        await fs.rm(`${json}.tmp`, { force: true });
        await fs.rm(ssf, { force: true });

        return existed;
    });
}

// Deletes every suspended mission in the folder, calling onDeleted with the item of each readable one.
export async function deleteAllSuspendedMissions(dir: string, onDeleted: (item: SuspendedMissionFile["item"]) => void): Promise<void> {
    const { files } = await readSuspendedMissions(dir);
    for (const file of files) {
        await deleteSuspendedMission(dir, file.item.kind, file.item);
        onDeleted(file.item);
    }
    let names: string[];
    try {
        names = await fs.readdir(dir);
    } catch {
        return;
    }
    for (const name of names.filter((name) => /\.(json|ssf)(\.tmp)?$/.test(name))) {
        await fs.rm(path.join(dir, name), { force: true });
    }
}

export async function sha256OfFile(filePath: string): Promise<string> {
    const hash = crypto.createHash("sha256");
    for await (const chunk of createReadStream(filePath)) {
        hash.update(chunk as Buffer);
    }

    return hash.digest("hex");
}

// What the client knew when it launched a mission, which a save made in that game is kept with.
export type MissionLaunchRecord = {
    item: SuspendedMissionFile["item"];
    missionId: string;
    entryPoint: string;
    engineVersion: string;
    gameVersion: string;
    archiveName: string;
    archiveSha256: string;
    saveVersion?: number;
    // When the game was launched, in ms. Only saves written since are the game's.
    startedAt: number;
};

/**
 * After a mission's game has closed, keeps the newest save the player made in it as the item's suspended
 * mission, replacing any it had. The engine writes every save to one folder, under whatever name the player gave
 * it, so a save is told to be the game's by when it was written and by the mission its header names. The game's
 * other saves are deleted with it. Gives the kept file, or undefined if the game made no save, which leaves
 * the item's suspended mission as it was.
 */
export async function adoptEngineSave(engineSavesDir: string, dir: string, launch: MissionLaunchRecord): Promise<SuspendedMissionFile | undefined> {
    let names: string[];
    try {
        names = await fs.readdir(engineSavesDir);
    } catch {
        return undefined;
    }

    const matches: { ssf: string; mtimeMs: number; playerName: string; difficulty?: string }[] = [];
    for (const name of names.filter((name) => name.toLowerCase().endsWith(".ssf"))) {
        const ssf = path.join(engineSavesDir, name);
        try {
            const { mtimeMs } = await fs.stat(ssf);
            if (mtimeMs < launch.startedAt) {
                continue;
            }
            const header = await readEngineSaveHeader(ssf);
            const mission = await savedMission(header);
            if (header.engineVersion === launch.engineVersion && mission?.archiveName === launch.archiveName && mission.entryPoint === launch.entryPoint) {
                matches.push({ ssf, mtimeMs, playerName: mission.playerName, difficulty: mission.difficulty });
            }
        } catch (err) {
            log.warn(`Skipping ${ssf}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    if (matches.length === 0) {
        return undefined;
    }
    matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const [newest, ...older] = matches;

    const { json, ssf } = filesOf(dir, launch.item.kind, launch.item);
    const file: SuspendedMissionFile = {
        formatVersion: SUSPENDED_FORMAT_VERSION,
        item: launch.item,
        missionId: launch.missionId,
        playerName: newest.playerName,
        ...(newest.difficulty ? { difficulty: newest.difficulty } : {}),
        engineVersion: launch.engineVersion,
        gameVersion: launch.gameVersion,
        archiveName: launch.archiveName,
        archiveSha256: launch.archiveSha256,
        ...(launch.saveVersion === undefined ? {} : { saveVersion: launch.saveVersion }),
        savedAt: new Date(newest.mtimeMs).toISOString(),
    };
    await queued(json, async () => {
        await fs.mkdir(dir, { recursive: true });
        // The old description goes before its engine save is replaced, so the two never disagree.
        await fs.rm(json, { force: true });
        await moveFile(newest.ssf, ssf);
        const tempPath = `${json}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(file, null, 4));
        await fs.rename(tempPath, json);
    });
    log.info(`Kept ${path.basename(newest.ssf)} as the suspended ${launch.item.kind} ${launch.item.id} mission ${launch.missionId}`);

    // BAR writes a .lua description beside each save it makes.
    for (const { ssf: other } of [newest, ...older]) {
        await fs.rm(other.replace(/\.ssf$/i, ".lua"), { force: true });
    }
    for (const { ssf: other } of older) {
        await fs.rm(other, { force: true });
    }

    return file;
}

// A rename, or a copy where the folders are on different drives, as they can be when the state dir is overridden.
async function moveFile(from: string, to: string) {
    try {
        await fs.rename(from, to);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EXDEV") {
            throw err;
        }
        await fs.copyFile(from, `${to}.tmp`);
        await fs.rename(`${to}.tmp`, to);
        await fs.rm(from, { force: true });
    }
}
