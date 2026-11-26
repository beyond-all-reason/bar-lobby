// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import zlib from "node:zlib";
import { MISSION_OPTIONS_KEY } from "@shared/content/schema/common";
import { decodeModoptionValue } from "@shared/startbox-modoptions";

// The start of a Recoil full save (.ssf): a gzip stream whose first fields are NUL-terminated strings, written
// by CCregLoadSaveHandler::SaveGame: the engine's sync version, the game's whole start script, then the map name.
export type EngineSaveHeader = {
    engineVersion: string;
    script: string;
    mapName: string;
};

const HEADER_FIELDS = 3;
// The engine caps each field at 512 kB, and they compress well; a file whose header doesn't fit isn't a save.
const MAX_COMPRESSED_READ = 4 * 1024 * 1024;

function headerFields(bytes: Buffer): string[] | undefined {
    const fields: string[] = [];
    let start = 0;
    while (fields.length < HEADER_FIELDS) {
        const end = bytes.indexOf(0, start);
        if (end < 0) {
            return undefined;
        }
        fields.push(bytes.subarray(start, end).toString("utf8"));
        start = end + 1;
    }

    return fields;
}

/**
 * Reads the header without the engine, decompressing only as much of the file as it needs. Throws if the file
 * isn't a gzip stream or ends before the header does.
 */
export async function readEngineSaveHeader(filePath: string): Promise<EngineSaveHeader> {
    const handle = await fs.open(filePath, "r");
    try {
        for (let size = 64 * 1024; ; size *= 4) {
            const { buffer, bytesRead } = await handle.read(Buffer.alloc(size), 0, size, 0);
            // Z_SYNC_FLUSH gives what the bytes read so far decompress to, rather than failing on the cut-off end.
            const fields = headerFields(zlib.gunzipSync(buffer.subarray(0, bytesRead), { finishFlush: zlib.constants.Z_SYNC_FLUSH }));
            if (fields) {
                const [engineVersion, script, mapName] = fields;
                return { engineVersion, script, mapName };
            }
            if (bytesRead < size || size >= MAX_COMPRESSED_READ) {
                throw new Error(`${filePath}: no complete save header`);
            }
        }
    } finally {
        await handle.close();
    }
}

// A key's value in a start script, wherever it is. The keys read here appear only once in a mission's script.
function scriptValue(script: string, key: string): string | undefined {
    return new RegExp(`^\\s*${key}\\s*=\\s*([^;\\r\\n]*);`, "im").exec(script)?.[1].trim();
}

// What a save says about the mission it was played from, as the client's own start script wrote it.
export type SavedMission = {
    // The mission archive, as the start script's gametype names it.
    archiveName: string;
    entryPoint: string;
    difficulty?: string;
    playerName: string;
};

// Undefined for a save that isn't of a mission the client launched, such as a skirmish.
export async function savedMission({ script }: EngineSaveHeader): Promise<SavedMission | undefined> {
    const archiveName = scriptValue(script, "gametype");
    const playerName = scriptValue(script, "myplayername");
    const options = (await decodeModoptionValue(scriptValue(script, MISSION_OPTIONS_KEY))) as { entryPoint?: unknown; difficulty?: unknown } | undefined;
    if (!archiveName || !playerName || typeof options?.entryPoint !== "string") {
        return undefined;
    }

    return { archiveName, entryPoint: options.entryPoint, difficulty: typeof options.difficulty === "string" ? options.difficulty : undefined, playerName };
}
