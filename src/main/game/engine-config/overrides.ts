// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { isDeviceKey } from "@shared/engine-settings/device-keys";
import { isGameOwnedKey } from "@shared/engine-settings/game-owned-keys";
import type { EngineSettingValues } from "@shared/engine-settings/engine-settings";

/**
 * The user's changes from the defaults, split by where they are kept. A key lives in the one isDeviceKey picks.
 * Files written before a change to the device key patterns may hold it in the other until routeOverrides moves it.
 */
export type Overrides = { synced: EngineSettingValues; device: EngineSettingValues };

export type ValuesDiff = { set: EngineSettingValues; removed: string[] };

export type DroppedKey = { key: string; value: string; reason: "default" | "truncated" | "game-owned" };

const clientOwned = (values: EngineSettingValues): EngineSettingValues => Object.fromEntries(Object.entries(values).filter(([key]) => !isGameOwnedKey(key)));

// The game-owned keys in a file, to carry through when the file is rewritten.
export const gameOwned = (values: EngineSettingValues): EngineSettingValues => Object.fromEntries(Object.entries(values).filter(([key]) => isGameOwnedKey(key)));

// Without game-owned keys, which a master copy from before they were known as such may still hold.
export const withoutGameOwned = (overrides: Overrides): Overrides => ({ synced: clientOwned(overrides.synced), device: clientOwned(overrides.device) });

// Only what the client keeps: the game's own changes to game-owned keys are its business.
export const clientChanges = (diff: ValuesDiff): ValuesDiff => ({ set: clientOwned(diff.set), removed: diff.removed.filter((key) => !isGameOwnedKey(key)) });

export function diffValues(before: EngineSettingValues, after: EngineSettingValues): ValuesDiff {
    const set: EngineSettingValues = {};
    for (const [key, value] of Object.entries(after)) {
        if (!Object.hasOwn(before, key) || before[key] !== value) {
            set[key] = value;
        }
    }

    return { set, removed: Object.keys(before).filter((key) => !Object.hasOwn(after, key)) };
}

// Every override as one set of values, to be written for the engine.
export function effectiveOverrides(overrides: Overrides): EngineSettingValues {
    const values: EngineSettingValues = {};
    for (const key of new Set([...Object.keys(overrides.synced), ...Object.keys(overrides.device)])) {
        const [own, other] = isDeviceKey(key) ? [overrides.device, overrides.synced] : [overrides.synced, overrides.device];
        values[key] = Object.hasOwn(own, key) ? own[key] : other[key];
    }

    return values;
}

// Every key in the file isDeviceKey picks, keeping the value effectiveOverrides would use.
export function routeOverrides(overrides: Overrides): Overrides {
    const routed: Overrides = { synced: {}, device: {} };
    for (const [key, value] of Object.entries(effectiveOverrides(overrides))) {
        routed[isDeviceKey(key) ? "device" : "synced"][key] = value;
    }

    return routed;
}

const without = (values: EngineSettingValues, key: string): EngineSettingValues => Object.fromEntries(Object.entries(values).filter(([other]) => other !== key));

export function setOverride(overrides: Overrides, key: string, value: string): Overrides {
    const synced = without(overrides.synced, key);
    const device = without(overrides.device, key);

    return isDeviceKey(key) ? { synced, device: { ...device, [key]: value } } : { synced: { ...synced, [key]: value }, device };
}

// Back to the default.
export function removeOverride(overrides: Overrides, key: string): Overrides {
    return { synced: without(overrides.synced, key), device: without(overrides.device, key) };
}

/**
 * Folds what changed in the engine's file into the overrides. A key that was removed went back to its default,
 * unless keepRemoved says otherwise: the engine also removes keys it no longer supports, and an older engine
 * may still want them.
 */
export function applyChanges(overrides: Overrides, diff: ValuesDiff, keepRemoved: (key: string) => boolean): Overrides {
    let result = overrides;
    for (const [key, value] of Object.entries(diff.set)) {
        result = setOverride(result, key, value);
    }
    for (const key of diff.removed) {
        if (!keepRemoved(key)) {
            result = removeOverride(result, key);
        }
    }

    return result;
}

/**
 * Keys that look like the tail of another line, left behind when two processes rewrote the file at once: not a
 * key the engine knows, and the end of another key with the same value. A fragment of a value that changed
 * since, such as `ersion = 8` beside `version = 9`, can't be told from a real key and is kept.
 */
export function findTruncatedKeys(values: EngineSettingValues, isKnownKey: (key: string) => boolean): string[] {
    const keys = Object.keys(values);

    return keys.filter((key) => !isKnownKey(key) && keys.some((other) => other !== key && other.endsWith(key) && values[other] === values[key]));
}

/**
 * Takes an existing springsettings.cfg as the starting point, when there is no record of what the client wrote
 * to it. Game-owned keys, values equal to the client's defaults and truncated keys are dropped. On a conflict, a device key
 * takes the file's value, since the file is this machine's, and a synced key keeps the master's, which may
 * have come from another machine.
 */
export function adoptCfg(file: EngineSettingValues, master: Overrides, clientDefaults: EngineSettingValues, isKnownKey: (key: string) => boolean): { overrides: Overrides; dropped: DroppedKey[] } {
    const truncated = new Set(findTruncatedKeys(file, isKnownKey));
    const masterValues = effectiveOverrides(master);
    const dropped: DroppedKey[] = [];
    let overrides = master;
    for (const [key, value] of Object.entries(file)) {
        if (isGameOwnedKey(key)) {
            dropped.push({ key, value, reason: "game-owned" });
        } else if (truncated.has(key)) {
            dropped.push({ key, value, reason: "truncated" });
        } else if (clientDefaults[key] === value) {
            dropped.push({ key, value, reason: "default" });
        } else if (isDeviceKey(key) || !Object.hasOwn(masterValues, key)) {
            overrides = setOverride(overrides, key, value);
        }
    }

    return { overrides, dropped };
}
