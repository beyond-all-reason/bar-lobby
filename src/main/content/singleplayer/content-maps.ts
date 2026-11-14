// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import path from "node:path";
import { springNameFromMapInfo } from "../../../../vendor/map-parser/map-name";
import { run7za } from "./mission-archive";
import type { Problems } from "./problems";

// The engine looks for maps in maps/ inside each data directory.
export const MAPS_FOLDER = "maps";

type MapRead = { name: string } | { error: string };

// singleplayer:list rescans on every call, and each read starts a 7-Zip process.
const reads = new Map<string, { mtimeMs: number; size: number; read: MapRead }>();

async function readMapName(file: string, mtimeMs: number, size: number): Promise<MapRead> {
    const cached = reads.get(file);
    if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
        return cached.read;
    }
    const extracted = await run7za(["x", file, "-so", "mapinfo.lua"]);
    const mapinfo = "error" in extracted ? undefined : extracted.stdout.toString();
    let read: MapRead;
    try {
        if (!mapinfo) {
            throw new Error("error" in extracted ? extracted.error : "it has no mapinfo.lua");
        }
        read = { name: springNameFromMapInfo(mapinfo, path.parse(file).name) };
    } catch (error) {
        read = { error: error instanceof Error ? error.message : String(error) };
    }
    reads.set(file, { mtimeMs, size, read });

    return read;
}

/**
 * The maps in folder/maps/, by name, each with its file. Read as the client's map scan reads maps: .sd7 only,
 * named by mapinfo.lua. A .sdz, or a map whose name can't be read, is a warning and is left out.
 */
export async function readContentMaps(folder: string, problems: Problems): Promise<Map<string, string>> {
    const mapsFolder = path.join(folder, MAPS_FOLDER);
    const maps = new Map<string, string>();
    const entries = await fs.readdir(mapsFolder).catch(() => [] as string[]);
    for (const entry of entries.sort()) {
        const file = path.join(mapsFolder, entry);
        if (entry.endsWith(".sdz")) {
            problems.warning(file, "Only .sd7 maps are read, as the client reads them, so this map is ignored");
            continue;
        }
        const stats = entry.endsWith(".sd7") ? await fs.stat(file).catch(() => undefined) : undefined;
        if (!stats?.isFile()) {
            continue;
        }
        const read = await readMapName(file, stats.mtimeMs, stats.size);
        if ("error" in read) {
            problems.warning(file, `Map name could not be read: ${read.error}`);
        } else if (!maps.has(read.name)) {
            maps.set(read.name, file);
        }
    }

    return maps;
}

/**
 * A campaign keeps each map in one place: in shared/maps/ when several missions use it, in a mission's own
 * maps/ when only that mission does. Every copy elsewhere is a warning.
 */
export function warnDuplicateCampaignMaps(campaignFolder: string, sharedMaps: ReadonlyMap<string, string>, missionMaps: readonly ReadonlyMap<string, string>[], problems: Problems) {
    const where = (file: string) => path.relative(campaignFolder, file);
    const inMissions = new Map<string, string[]>();
    for (const maps of missionMaps) {
        for (const [name, file] of maps) {
            const sharedFile = sharedMaps.get(name);
            if (sharedFile) {
                problems.warning(
                    file,
                    `Map "${name}" is also in ${where(sharedFile)}. A map used by several missions belongs only in shared/maps, one used by a single mission only in that mission's maps`
                );
            } else {
                inMissions.set(name, [...(inMissions.get(name) ?? []), file]);
            }
        }
    }
    for (const [name, files] of inMissions) {
        for (const file of files.length > 1 ? files : []) {
            const others = files.filter((other) => other !== file).map(where);
            problems.warning(file, `Map "${name}" is also in ${others.join(", ")}. A map used by several missions belongs only in shared/maps`);
        }
    }
}
