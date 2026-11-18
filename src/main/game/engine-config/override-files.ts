// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// The master copy of the user's engine settings, and the snapshot of what was last written for the engine.
// Read as campaign saves are: a file written by a newer client, or one that can't be read or doesn't validate
// (perhaps only half synced), is left alone, never reset, and nothing is written over it.

import fs from "node:fs/promises";
import path from "node:path";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import { AppliedSnapshot, ENGINE_SETTINGS_FORMAT_VERSION, EngineSettingsFile, type EngineSettingValues } from "@shared/engine-settings/engine-settings";
import { queued } from "@main/utils/file-queue";

const ajv = new Ajv2020({ strict: true, allErrors: true });
const validateSettingsFile = ajv.compile<EngineSettingsFile>(EngineSettingsFile);
const validateSnapshot = ajv.compile<AppliedSnapshot>(AppliedSnapshot);

export class UnusableSettingsFileError extends Error {
    constructor(filePath: string, problem: string) {
        super(`${filePath}: ${problem}`);
        this.name = "UnusableSettingsFileError";
    }
}

type ReadJson<T> = { value: T } | { missing: true } | { problem: string };

async function readJson<T>(filePath: string, validate: ValidateFunction<T>): Promise<ReadJson<T>> {
    let text: string;
    try {
        text = await fs.readFile(filePath, "utf8");
    } catch (err) {
        return (err as NodeJS.ErrnoException).code === "ENOENT" ? { missing: true } : { problem: `Cannot be read: ${err instanceof Error ? err.message : String(err)}` };
    }

    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch (err) {
        return { problem: `Not valid JSON: ${err instanceof Error ? err.message : String(err)}` };
    }

    const formatVersion = (value as { formatVersion?: unknown } | null)?.formatVersion;
    if (typeof formatVersion === "number" && formatVersion > ENGINE_SETTINGS_FORMAT_VERSION) {
        return { problem: `Written by a newer client: format version ${formatVersion}, and this client supports up to ${ENGINE_SETTINGS_FORMAT_VERSION}` };
    }
    if (!validate(value)) {
        return { problem: ajv.errorsText(validate.errors) };
    }

    return { value };
}

// Keys sorted, so the same values always give the same file and a sync only sees real changes.
function sortedValues(values: EngineSettingValues): EngineSettingValues {
    return Object.fromEntries(Object.entries(values).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

// Through a temp file, so a crash mid-write can't truncate it. The temp name doesn't end in .json, so a cloud
// sync pattern doesn't pick it up.
async function writeJson(filePath: string, value: unknown) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(value, null, 4));
    await fs.rename(tempPath, filePath);
}

export type OverridesRead = { values: EngineSettingValues } | { problem: string };

// The overrides in one master file; a missing file has none.
export async function readOverrides(filePath: string): Promise<OverridesRead> {
    const read = await readJson(filePath, validateSettingsFile);
    if ("problem" in read) {
        return read;
    }

    return { values: "value" in read ? read.value.values : {} };
}

/**
 * Changes one master file's overrides, one change at a time per file, and returns them. Writes nothing when
 * the values didn't change, or when there was no file and there are still no overrides. Other fields in the
 * file are kept. Throws an UnusableSettingsFileError, and leaves the file alone, if it can't be used.
 */
export function updateOverrides(filePath: string, change: (values: EngineSettingValues) => EngineSettingValues): Promise<EngineSettingValues> {
    return queued(filePath, async () => {
        const read = await readJson(filePath, validateSettingsFile);
        if ("problem" in read) {
            throw new UnusableSettingsFileError(filePath, read.problem);
        }
        const before = "value" in read ? read.value.values : {};
        const after = sortedValues(change(before));
        const unchanged = JSON.stringify(sortedValues(before)) === JSON.stringify(after);
        if (unchanged || ("missing" in read && Object.keys(after).length === 0)) {
            return before;
        }
        await writeJson(filePath, { ...("value" in read ? read.value : {}), formatVersion: ENGINE_SETTINGS_FORMAT_VERSION, values: after });

        return after;
    });
}

export type SnapshotRead = { snapshot: AppliedSnapshot } | { missing: true } | { problem: string };

export async function readSnapshot(filePath: string): Promise<SnapshotRead> {
    const read = await readJson(filePath, validateSnapshot);

    return "value" in read ? { snapshot: read.value } : read;
}

export function writeSnapshot(filePath: string, snapshot: Omit<AppliedSnapshot, "formatVersion">): Promise<void> {
    return queued(filePath, () => writeJson(filePath, { ...snapshot, formatVersion: ENGINE_SETTINGS_FORMAT_VERSION, values: sortedValues(snapshot.values) }));
}
