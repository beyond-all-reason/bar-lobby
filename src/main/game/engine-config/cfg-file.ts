// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import { writeFileAtomic } from "@main/utils/atomic-write";
import { type EngineSettingValues, isEngineSettingKey, isEngineSettingValue } from "@shared/engine-settings/engine-settings";

export type ParsedCfg = {
    values: EngineSettingValues;
    // Lines that aren't blank or comments but can't be kept as a setting, such as one with no key.
    skipped: string[];
};

/**
 * Reads springsettings.cfg as the engine does: one `Key = Value` per line, split at the first `=`, both sides
 * trimmed, `#` lines are comments. Tolerates CRLF and a BOM. A key given twice keeps its last value.
 */
export function parseCfg(text: string): ParsedCfg {
    const values: EngineSettingValues = {};
    const skipped: string[] = [];
    const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    for (const rawLine of withoutBom.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line === "" || line.startsWith("#")) {
            continue;
        }
        const equals = line.indexOf("=");
        const key = equals < 0 ? "" : line.slice(0, equals).trim();
        const value = equals < 0 ? "" : line.slice(equals + 1).trim();
        if (isEngineSettingKey(key) && isEngineSettingValue(value)) {
            values[key] = value;
        } else {
            skipped.push(line);
        }
    }

    return { values, skipped };
}

// Sorted by code unit, as the engine writes it, so a file the engine rewrites unchanged stays the same.
export function serializeCfg(values: EngineSettingValues): string {
    return Object.keys(values)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        .map((key) => `${key} = ${values[key]}\n`)
        .join("");
}

// The file's settings, or undefined if there is no file. Throws if it exists but can't be read.
export async function readCfg(filePath: string): Promise<ParsedCfg | undefined> {
    let text: string;
    try {
        text = await fs.readFile(filePath, "utf8");
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            return undefined;
        }
        throw err;
    }

    return parseCfg(text);
}

export const writeCfgAtomic = (filePath: string, values: EngineSettingValues) => writeFileAtomic(filePath, serializeCfg(values));
