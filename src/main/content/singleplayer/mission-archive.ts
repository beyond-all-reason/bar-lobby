// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// An item's synced Lua ships as a mutator archive in its folder's games/, where the engine finds it once the
// item folder is one of its data directories. The client reads the archive's listing and its modinfo.lua.

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { DEV_COMPATIBILITY, type ItemCompatibility } from "../../../shared/content/schema/common";
import type { SingleplayerKind } from "../../../shared/content/singleplayer";
import { archiveGameName, type ModInfoResult, readModInfo } from "./modinfo";
import type { Problems } from "./problems";

// Not vendor/7zip-min, which mixes require() with ESM and so cannot load in tools/validate-content.ts. The
// binary is unpacked from the asar, as there. 7zip-bin works out its path on import, so it is imported only
// once an archive is found rather than with the rest of main.
async function sevenZipPath() {
    const { path7za } = await import("7zip-bin");

    return path7za.replace("app.asar", "app.asar.unpacked");
}

export const MODINFO_FILE = "modinfo.lua";

// The engine looks for game archives in games/ inside each data directory.
export const ARCHIVE_FOLDER = "games";

// Archives with the same name shadow each other in the engine, so the name carries the kind and id.
export function archiveName(kind: SingleplayerKind, id: string) {
    return `bar-${kind}-${id}`;
}

export const KIND_FOLDERS = { campaign: "campaigns", scenario: "scenarios", tutorial: "tutorials" } as const;

// Where a mission's Lua is inside its archive, mirroring the content folder. The Mission API is given it as entryPoint.
export function missionLuaPath(kind: SingleplayerKind, id: string, missionId?: string) {
    return kind === "campaign" ? `${KIND_FOLDERS.campaign}/${id}/${missionId}/mission.lua` : `${KIND_FOLDERS[kind]}/${id}/mission.lua`;
}

export function archivePathOf(folder: string, kind: SingleplayerKind, id: string) {
    return path.join(folder, ARCHIVE_FOLDER, `${archiveName(kind, id)}.sdz`);
}

type Read = { entries: Set<string>; modInfo?: ModInfoResult } | { error: string };

// singleplayer:list rescans on every call, and each read starts 7-Zip processes.
const reads = new Map<string, { mtimeMs: number; size: number; read: Read }>();

export function run7za(args: string[]): Promise<{ stdout: Buffer } | { error: string }> {
    return sevenZipPath().then(
        (sevenZip) =>
            new Promise((resolve) => {
                execFile(sevenZip, args, { windowsHide: true, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
                    if (error) {
                        const reason = `${stderr.toString()}\n${stdout.toString()}`.split(/\r?\n/).find((line) => /error/i.test(line));
                        // Such as "ERROR: <path> : Cannot open the file as archive"; the problem already names the path.
                        resolve({ error: reason?.split(" : ").pop()?.trim() || error.message });

                        return;
                    }
                    resolve({ stdout });
                });
            })
    );
}

async function readArchive(archivePath: string): Promise<Read> {
    // `-slt` gives one `Path = …` line per entry, and `-ba` leaves out the header, whose `Path` is the archive itself.
    const listed = await run7za(["l", "-slt", "-ba", archivePath]);
    if ("error" in listed) {
        return listed;
    }
    const entries = new Set(
        listed.stdout
            .toString("utf8")
            .split(/\r?\n/)
            .flatMap((line) => (line.startsWith("Path = ") ? [line.slice("Path = ".length).replaceAll("\\", "/")] : []))
    );
    if (!entries.has(MODINFO_FILE)) {
        return { entries };
    }

    const extracted = await run7za(["e", "-so", archivePath, MODINFO_FILE]);

    return { entries, modInfo: "error" in extracted ? { error: `${MODINFO_FILE} could not be read: ${extracted.error}` } : readModInfo(extracted.stdout) };
}

async function isFile(file: string) {
    try {
        return (await fs.stat(file)).isFile();
    } catch {
        return false;
    }
}

async function cachedRead(archivePath: string, mtimeMs: number, size: number): Promise<Read> {
    const cached = reads.get(archivePath);
    if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
        return cached.read;
    }
    const read = await readArchive(archivePath);
    reads.set(archivePath, { mtimeMs, size, read });

    return read;
}

export type MissionArchiveOptions = {
    folder: string;
    kind: SingleplayerKind;
    id: string;
    // Inside the archive, with `/` separators. Matched case-sensitively, as the engine does on Linux.
    missionLuaPaths: string[];
    compatibility: ItemCompatibility;
};

export type MissionArchive = {
    archivePath: string;
    // The game name a start script gives the archive: modinfo's name and version.
    archiveName: string;
    // The games modinfo.lua depends on.
    archiveDepend: string[];
};

/**
 * Checks the item's archive, if it has one. An archive that cannot be read, lacks a file the engine needs, or
 * whose modinfo.lua doesn't match the item or names no game to depend on is an error. One left at the item's
 * root instead of in games/ is a warning.
 */
export async function checkMissionArchive({ folder, kind, id, missionLuaPaths, compatibility }: MissionArchiveOptions, problems: Problems): Promise<MissionArchive | undefined> {
    const archivePath = archivePathOf(folder, kind, id);
    let stats;
    try {
        stats = await fs.stat(archivePath);
    } catch {
        stats = undefined;
    }
    // An item without one still loads, but can't be launched: the client marks it unplayable and
    // validate-content --bundle refuses it.
    if (!stats?.isFile()) {
        const atRoot = path.join(folder, path.basename(archivePath));
        if (await isFile(atRoot)) {
            problems.warning(atRoot, `The engine looks for the mission archive only in ${ARCHIVE_FOLDER}/, so this one is not used. Move it to ${archivePath}`);
        }

        return undefined;
    }

    const read = await cachedRead(archivePath, stats.mtimeMs, stats.size);
    if ("error" in read) {
        problems.error(archivePath, `Archive could not be opened: ${read.error}`);

        return undefined;
    }

    let failed = false;
    const fail = (message: string) => {
        problems.error(archivePath, message);
        failed = true;
    };

    if (!read.entries.has(MODINFO_FILE)) {
        fail(`Archive has no ${MODINFO_FILE} at its root, so the engine cannot load it`);
    }
    for (const file of missionLuaPaths.filter((file) => !read.entries.has(file))) {
        fail(`Archive has no ${file}, where the mission's Lua is looked for`);
    }

    const modInfo = read.modInfo && ("error" in read.modInfo ? (fail(read.modInfo.error), undefined) : read.modInfo.modInfo);
    if (modInfo) {
        if (modInfo.name !== archiveName(kind, id)) {
            fail(`${MODINFO_FILE} names the archive "${modInfo.name}", but its file is named for "${archiveName(kind, id)}"`);
        }
        // Content still in development is launched with the first game in depend that this install has or can download.
        if (modInfo.depend.length === 0) {
            fail(`${MODINFO_FILE} has no depend, so the archive has no game to load with. Name the base game, as in depend = { "Beyond All Reason <version>" }`);
        } else if (compatibility !== DEV_COMPATIBILITY) {
            const games = new Set(compatibility.flatMap((entry) => entry.gameVersions));
            if (!modInfo.depend.some((game) => games.has(game))) {
                fail(`${MODINFO_FILE}'s depend names ${modInfo.depend.map((game) => `"${game}"`).join(", ")}, but none of the games in compatibility`);
            }
        }
    }

    return failed || !modInfo ? undefined : { archivePath, archiveName: archiveGameName(modInfo), archiveDepend: modInfo.depend };
}
