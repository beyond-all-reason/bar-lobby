// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// An item's synced Lua ships as a mutator archive in its folder. Only its listing is read: what modinfo.lua
// says is left to the engine, which is what enforces it.

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { SingleplayerKind } from "../../../shared/content/singleplayer";
import type { Problems } from "./problems";

// Not vendor/7zip-min, which mixes require() with ESM and so cannot load in tools/validate-content.ts. The
// binary is unpacked from the asar, as there. 7zip-bin works out its path on import, so it is imported only
// once an archive is found rather than with the rest of main.
async function sevenZipPath() {
    const { path7za } = await import("7zip-bin");

    return path7za.replace("app.asar", "app.asar.unpacked");
}

export const MODINFO_FILE = "modinfo.lua";

// Archives with the same name shadow each other in the engine, so the name carries the kind and id.
export function archiveFileName(kind: SingleplayerKind, id: string) {
    return `bar-${kind}-${id}.sdz`;
}

type Listing = { entries: Set<string> } | { error: string };

// singleplayer:list rescans on every call, and each listing starts a 7-Zip process.
const listings = new Map<string, { mtimeMs: number; size: number; listing: Listing }>();

// `-slt` gives one `Path = …` line per entry, and `-ba` leaves out the header, whose `Path` is the archive itself.
async function listArchive(archivePath: string): Promise<Listing> {
    const sevenZip = await sevenZipPath();

    return new Promise((resolve) => {
        execFile(sevenZip, ["l", "-slt", "-ba", archivePath], { windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                const reason = `${stderr}\n${stdout}`.split(/\r?\n/).find((line) => /error/i.test(line));
                // Such as "ERROR: <path> : Cannot open the file as archive"; the problem already names the path.
                resolve({ error: reason?.split(" : ").pop()?.trim() || error.message });

                return;
            }
            const entries = stdout.split(/\r?\n/).flatMap((line) => (line.startsWith("Path = ") ? [line.slice("Path = ".length).replaceAll("\\", "/")] : []));
            resolve({ entries: new Set(entries) });
        });
    });
}

async function cachedListing(archivePath: string, mtimeMs: number, size: number): Promise<Listing> {
    const cached = listings.get(archivePath);
    if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
        return cached.listing;
    }
    const listing = await listArchive(archivePath);
    listings.set(archivePath, { mtimeMs, size, listing });

    return listing;
}

export type MissionArchiveOptions = {
    folder: string;
    kind: SingleplayerKind;
    id: string;
    // Inside the archive, with `/` separators. Matched case-sensitively, as the engine does on Linux.
    missionLuaPath?: string;
};

/**
 * Checks the item's archive, if it has one, and gives its path. An archive that cannot be read, or lacks a
 * file the engine needs, is an error.
 */
export async function checkMissionArchive({ folder, kind, id, missionLuaPath }: MissionArchiveOptions, problems: Problems): Promise<string | undefined> {
    const archivePath = path.join(folder, archiveFileName(kind, id));
    let stats;
    try {
        stats = await fs.stat(archivePath);
    } catch {
        stats = undefined;
    }
    if (!stats?.isFile()) {
        // TODO(mission launch): once missions launch, a missing archive must become a warning, such as
        // `${kind} "${id}" has no ${archiveFileName(kind, id)}, so it cannot be launched`. Give the test
        // fixtures archives at the same time. It is optional only while nothing launches.
        return undefined;
    }

    const listing = await cachedListing(archivePath, stats.mtimeMs, stats.size);
    if ("error" in listing) {
        problems.error(archivePath, `Archive could not be opened: ${listing.error}`);

        return undefined;
    }

    const missing = [MODINFO_FILE, ...(missionLuaPath === undefined ? [] : [missionLuaPath])].filter((file) => !listing.entries.has(file));
    for (const file of missing) {
        problems.error(
            archivePath,
            file === MODINFO_FILE ? `Archive has no ${MODINFO_FILE} at its root, so the engine cannot load it` : `Archive has no ${file}, where the mission's Lua is looked for`
        );
    }

    return missing.length === 0 ? archivePath : undefined;
}
