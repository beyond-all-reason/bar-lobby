// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

/**
 * Keeps the user's engine settings in the client's master copy and the engine's springsettings.cfg in step.
 *
 * Before each launch the client writes its defaults as a read-only layer the engine reads beneath the user's
 * file, writes the user's overrides into that file, and keeps a snapshot of what it wrote. Whatever differs
 * from the snapshot later was changed by the game or by hand, and is folded back into the master copy: at
 * startup, before every launch, and when the game exits. The engine removes values equal to the layer beneath,
 * so the file only ever holds real changes, and a key that disappears went back to its default.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Signal } from "$/jaz-ts-utils/signal";
import { CONFIG_PATH, ENGINE_CONFIG_PATH, ENGINE_DEFAULTS_PATH, PROFILE_ID, WRITE_DATA_PATH, getSyncedSettingsPath } from "@main/config/app";
import { getDefaultEngineVersion } from "@main/config/install-defaults";
import { contentAPI } from "@main/content/content-api";
import { configService } from "@main/services/config.service";
import { logger } from "@main/utils/logger";
import { queued } from "@main/utils/file-queue";
import { isDeprecated } from "@shared/engine-settings/config-vars";
import { type AppliedSnapshot, ENGINE_SETTINGS_FORMAT_VERSION, type EngineSettingValues, isEngineSettingKey, isEngineSettingValue } from "@shared/engine-settings/engine-settings";
import { readCfg, writeCfgAtomic } from "./cfg-file";
import { getConfigVars } from "./config-vars";
import { readOverrides, readSnapshot, UnusableSettingsFileError, updateOverrides, writeSnapshot } from "./override-files";
import { adoptCfg, applyChanges, clientChanges, diffValues, effectiveOverrides, gameOwned, type Overrides, removeOverride, routeOverrides, setOverride, withoutGameOwned } from "./overrides";
import { isDeviceKey } from "@shared/engine-settings/device-keys";
import { isGameOwnedKey } from "@shared/engine-settings/game-owned-keys";
import type { EngineSettingsStatus, EngineSettingsView, EngineVarInfo } from "@shared/engine-settings/view";

const log = logger("engine-config.ts");

const userCfgPath = () => path.join(WRITE_DATA_PATH, "springsettings.cfg");
const defaultsCfgPath = () => path.join(ENGINE_DEFAULTS_PATH, "springsettings.cfg");
const snapshotPath = () => path.join(ENGINE_CONFIG_PATH, "applied.json");
const backupPath = () => path.join(ENGINE_CONFIG_PATH, "springsettings.pre-migration.cfg");
const syncedPath = (profileId: string) => path.join(getSyncedSettingsPath(profileId), "engine.json");
const devicePath = () => path.join(CONFIG_PATH, "engine-device.json");

// While a master file can't be used, nothing is applied or folded back, and the engine's file is left as it is.
export type EngineConfigStatus = EngineSettingsStatus;

export type EngineSession = {
    // The game process is running. While it is alive at startup, the file is still the game's to change.
    started(pid: number): void;
    // The game process has closed: what it changed is folded back, and the next launch may go ahead.
    end(): Promise<void>;
};

let status: EngineConfigStatus = { usable: true };
// Held from the start of a launch until its process has closed, so launches never overlap on the engine's file.
let gate: Promise<void> = Promise.resolve();
// The window opens without waiting for init, which may list every installed engine; the view waits instead.
let initialized: Promise<void> = Promise.resolve();

export const onChanged = new Signal<void>();

export const getStatus = () => status;

/**
 * The client's defaults, from the remote config. Numbers are written as JavaScript prints them, as they were
 * before this layer existed, so a value the user saved then still compares equal.
 */
function clientDefaults(): EngineSettingValues {
    const defaults: EngineSettingValues = {};
    for (const [key, value] of Object.entries(configService.getConfig().springSettings)) {
        const text = String(value).trim();
        if (isEngineSettingKey(key) && isEngineSettingValue(text)) {
            defaults[key] = text;
        } else {
            log.warn(`Ignoring the default engine setting ${JSON.stringify(key)}, which can't be written to springsettings.cfg`);
        }
    }

    return defaults;
}

async function readMasters(profileId: string): Promise<Overrides> {
    const [synced, device] = await Promise.all([readOverrides(syncedPath(profileId)), readOverrides(devicePath())]);
    if ("problem" in synced) {
        throw new UnusableSettingsFileError(syncedPath(profileId), synced.problem);
    }
    if ("problem" in device) {
        throw new UnusableSettingsFileError(devicePath(), device.problem);
    }

    return { synced: synced.values, device: device.values };
}

const MASTERS_QUEUE = "engine-settings-masters";

// Every change to the master copy goes through here, one at a time, so a change made from the client while a
// game is running can't interleave with folding back the game's. Says whether anything changed.
function changeMasters(profileId: string, change: (overrides: Overrides) => Overrides): Promise<boolean> {
    return queued(MASTERS_QUEUE, async () => (await changeMastersQueued(profileId, change)).changed);
}

// The same keys and values, in any order.
const sameValues = (a: EngineSettingValues, b: EngineSettingValues) =>
    Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([key, value]) => Object.hasOwn(b, key) && b[key] === value);

/**
 * For callers already holding the masters queue. Game-owned keys are never kept, and every key is routed to the
 * file it belongs in, whatever the change. A key that only moved file counts as changed, since its scope did.
 */
async function changeMastersQueued(profileId: string, change: (overrides: Overrides) => Overrides): Promise<{ changed: boolean; overrides: Overrides }> {
    const before = await readMasters(profileId);
    const after = routeOverrides(withoutGameOwned(change(before)));
    const [synced, device] = await Promise.all([updateOverrides(syncedPath(profileId), () => after.synced), updateOverrides(devicePath(), () => after.device)]);
    const overrides = { synced, device };

    return { changed: !sameValues(before.synced, synced) || !sameValues(before.device, device), overrides };
}

// Undefined only when there is none. One that can't be used stops everything, as a master that can't be does:
// without it the file would be adopted again, and the snapshot written over.
async function readUsableSnapshot(): Promise<AppliedSnapshot | undefined> {
    const read = await readSnapshot(snapshotPath());
    if ("problem" in read) {
        throw new UnusableSettingsFileError(snapshotPath(), read.problem);
    }

    return "snapshot" in read ? read.snapshot : undefined;
}

/**
 * Folds whatever changed in the engine's file since the snapshot into the master copy of the snapshot's
 * profile. With no snapshot, the file is adopted as the starting point instead.
 */
async function reconcile(): Promise<void> {
    const snapshot = await readUsableSnapshot();
    const cfg = await readCfg(userCfgPath());
    if (cfg && cfg.skipped.length > 0) {
        log.warn(`Ignoring ${cfg.skipped.length} line(s) of ${userCfgPath()} that aren't settings: ${cfg.skipped.map((line) => JSON.stringify(line)).join(", ")}`);
    }
    const fileValues = cfg?.values ?? {};
    if (!snapshot) {
        await adopt(fileValues);
        return;
    }

    let diff = clientChanges(diffValues(snapshot.values, fileValues));
    // The game writes some of its own settings on every launch, so a file with none at all was lost or deleted,
    // not reset by it. Folding that back would reset every setting, on every machine the master syncs to.
    if (Object.keys(fileValues).length === 0 && diff.removed.length > 0) {
        log.warn(`${userCfgPath()} is missing or holds no settings, so the ${diff.removed.length} setting(s) written to it are kept rather than reset`);
        diff = { ...diff, removed: [] };
    }
    if (Object.keys(diff.set).length > 0 || diff.removed.length > 0) {
        const vars = snapshot.engineVersion ? await getConfigVars(snapshot.engineVersion) : undefined;
        const kept = diff.removed.filter((key) => vars !== undefined && isDeprecated(vars, key));
        const valueIn = (values: EngineSettingValues, key: string) => (Object.hasOwn(values, key) ? values[key] : "(default)");
        const describe = (key: string) => `${key}: ${valueIn(snapshot.values, key)} -> ${valueIn(fileValues, key)}`;
        const changes = [...Object.keys(diff.set), ...diff.removed.filter((key) => !kept.includes(key))].map(describe);
        log.info(`The game, or a hand edit, changed ${changes.length} engine setting(s) in ${userCfgPath()}: ${changes.join("; ")}`);
        if (kept.length > 0) {
            log.info(`Kept settings engine ${snapshot.engineVersion} removed as deprecated: ${kept.join(", ")}`);
        }
        if (await changeMasters(snapshot.profileId, (overrides) => applyChanges(overrides, diff, (key) => kept.includes(key)))) {
            onChanged.dispatch();
        }
    } else if (snapshot.pid === undefined) {
        return;
    }
    // The file as it is now is what the next comparison starts from, and the game it was written for is done.
    await writeSnapshot(snapshotPath(), { profileId: snapshot.profileId, engineVersion: snapshot.engineVersion, values: fileValues });
}

const dropReasons = {
    default: "equal to the client's default",
    truncated: "left over from a corrupted write",
    "game-owned": "the game sets it for itself",
};

/**
 * The first time, or on a machine that received the master copy from the cloud, the existing file is the
 * user's settings so far. It is backed up once, and game-owned keys, keys equal to the client's defaults and
 * keys left over from a corrupted write are dropped. Only the first profile adopts: once there is a snapshot, a new profile starts
 * from the defaults.
 */
async function adopt(fileValues: EngineSettingValues): Promise<void> {
    if (Object.keys(fileValues).length > 0) {
        try {
            await fs.mkdir(path.dirname(backupPath()), { recursive: true });
            await fs.copyFile(userCfgPath(), backupPath(), fs.constants.COPYFILE_EXCL);
            log.info(`Backed up ${userCfgPath()} to ${backupPath()}`);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
                throw err;
            }
        }
    }

    // A key any installed engine knows is real, even if the default engine doesn't know it.
    const installed = contentAPI.installed("engine").map((ref) => ref.id);
    const allVars = await Promise.all((installed.length > 0 ? installed : [getDefaultEngineVersion()]).map((version) => getConfigVars(version)));
    // With no listing at all every key would be unknown, and any real key that ends another would be dropped.
    const listed = allVars.filter((vars) => vars !== undefined);
    if (listed.length === 0) {
        log.warn("No engine's config variables could be listed, so no keys are dropped as left over from a corrupted write");
    }
    const isKnownKey = (key: string) => listed.length === 0 || listed.some((vars) => Object.hasOwn(vars, key));
    const defaults = clientDefaults();
    let dropped: ReturnType<typeof adoptCfg>["dropped"] = [];
    const changed = await changeMasters(PROFILE_ID, (master) => {
        const adopted = adoptCfg(fileValues, master, defaults, isKnownKey);
        dropped = adopted.dropped;

        return adopted.overrides;
    });
    log.info(`Adopted ${userCfgPath()} into the ${PROFILE_ID} profile's engine settings`);
    for (const { key, value, reason } of dropped) {
        log.info(`Dropped ${key} = ${value}: ${dropReasons[reason]}`);
    }
    if (changed) {
        onChanged.dispatch();
    }
    await writeSnapshot(snapshotPath(), { profileId: PROFILE_ID, values: fileValues });
}

/**
 * Writes the user's overrides into the engine's file, and records what was written. Game-owned keys keep the
 * values the game last wrote.
 */
async function apply(engineVersion: string): Promise<AppliedSnapshot | undefined> {
    return queued(MASTERS_QUEUE, async () => {
        // Also clears game-owned keys and moves misplaced ones, in a master copy written before either was known.
        const { changed, overrides } = await changeMastersQueued(PROFILE_ID, (unchanged) => unchanged);
        if (changed) {
            onChanged.dispatch();
        }
        const current = (await readCfg(userCfgPath()))?.values ?? {};
        const values = { ...effectiveOverrides(overrides), ...gameOwned(current) };
        await writeCfgAtomic(userCfgPath(), values);
        const snapshot = { formatVersion: ENGINE_SETTINGS_FORMAT_VERSION, profileId: PROFILE_ID, engineVersion, values };
        await writeSnapshot(snapshotPath(), snapshot);

        return snapshot;
    });
}

// Whoever shows the status hears when it changes, as for any other change.
function setOutcome(err?: unknown) {
    const before = JSON.stringify(status);
    if (err === undefined) {
        status = { usable: true };
    } else if (err instanceof UnusableSettingsFileError) {
        status = { usable: false, problem: err.message };
        log.error(`Engine settings are left as they are until this is fixed: ${err.message}`);
    } else {
        log.error("Engine settings could not be synchronised", err);
    }
    if (JSON.stringify(status) !== before) {
        onChanged.dispatch();
    }
}

// Waits for the gate and takes it. The caller releases it, which may be long after this returns.
async function holdGate(): Promise<() => void> {
    const previous = gate;
    let release!: () => void;
    gate = new Promise<void>((resolve) => (release = resolve));
    await previous;

    return release;
}

function isAlive(pid: number) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        return (err as NodeJS.ErrnoException).code === "EPERM";
    }
}

/**
 * Moves keys to the file they now belong in, then folds back what changed while the client wasn't running,
 * such as a game that outlived it. Folding back is skipped while that
 * game is still running, since the file is still its to change. Runs after content init, so adopting can ask
 * every installed engine which keys are real. Never throws. Takes the gate at once, so a launch made before it
 * finishes waits for it.
 */
export function init(): Promise<void> {
    initialized = initialize();

    return initialized;
}

async function initialize(): Promise<void> {
    const release = await holdGate();
    try {
        // Keys whose file changed since the last run move now, before the cloud syncs a device key elsewhere.
        if (await changeMasters(PROFILE_ID, (overrides) => overrides)) {
            onChanged.dispatch();
        }
        const snapshot = await readUsableSnapshot();
        if (snapshot?.pid !== undefined && isAlive(snapshot.pid)) {
            log.info(`The game started before the client last closed is still running (pid ${snapshot.pid}); its settings are folded back at the next launch`);
            return;
        }
        await reconcile();
        setOutcome();
    } catch (err) {
        setOutcome(err);
    } finally {
        release();
    }
}

/**
 * Prepares the engine's settings for a launch, after any launch still running has closed. Never throws: the
 * game starts with the file as it is if the settings can't be applied.
 */
export async function beginSession(engineVersion: string): Promise<EngineSession> {
    const release = await holdGate();
    // Needs no master, so the game gets the client's defaults even while the user's settings can't be applied.
    try {
        await writeCfgAtomic(defaultsCfgPath(), clientDefaults());
    } catch (err) {
        log.error(`Could not write the client's default engine settings to ${defaultsCfgPath()}`, err);
    }
    let applied: AppliedSnapshot | undefined;
    try {
        // Anything the file holds that isn't folded back yet would be lost by writing over it.
        await reconcile();
        applied = await apply(engineVersion);
        setOutcome();
    } catch (err) {
        setOutcome(err);
    }

    let pidWritten: Promise<void> = Promise.resolve();
    let ended: Promise<void> | undefined;

    return {
        started(pid) {
            if (applied && !ended) {
                pidWritten = writeSnapshot(snapshotPath(), { ...applied, pid }).catch((err) => log.warn("Could not record the game's pid", err));
            }
        },
        end() {
            ended ??= (async () => {
                try {
                    // Or a snapshot still naming the process could land after the one written below.
                    await pidWritten;
                    await reconcile();
                    setOutcome();
                } catch (err) {
                    setOutcome(err);
                } finally {
                    release();
                }
            })();

            return ended;
        },
    };
}

export class InvalidEngineSettingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidEngineSettingError";
    }
}

function checkSetting(key: string, value?: string) {
    if (!isEngineSettingKey(key)) {
        throw new InvalidEngineSettingError(`Not a key springsettings.cfg can hold: ${JSON.stringify(key)}`);
    }
    if (isGameOwnedKey(key)) {
        throw new InvalidEngineSettingError(`${key} is set by the game for itself`);
    }
    if (value !== undefined && !isEngineSettingValue(value)) {
        throw new InvalidEngineSettingError(`Not a value springsettings.cfg can hold for ${key}: ${JSON.stringify(value)}`);
    }
}

async function engineDefaults(): Promise<EngineSettingValues> {
    return (await defaultEngineVars()).defaults;
}

// Some limits are printed as strings, such as "0" for an unsigned variable.
function limit(value: number | string | undefined): number | undefined {
    const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;

    return typeof number === "number" && Number.isFinite(number) ? number : undefined;
}

async function defaultEngineVars(): Promise<{ defaults: EngineSettingValues; info: Record<string, EngineVarInfo> }> {
    const vars = await getConfigVars(getDefaultEngineVersion());
    const defaults: EngineSettingValues = {};
    const info: Record<string, EngineVarInfo> = {};
    for (const [key, meta] of Object.entries(vars ?? {})) {
        if (meta.defaultValue !== undefined) {
            defaults[key] = String(meta.defaultValue);
        }
        const min = limit(meta.minimumValue);
        const max = limit(meta.maximumValue);
        info[key] = {
            type: meta.type,
            ...(meta.description !== undefined && { description: meta.description }),
            ...(min !== undefined && { min }),
            ...(max !== undefined && { max }),
            ...(meta.deprecated ? { deprecated: true } : {}),
            ...(meta.readOnly ? { readOnly: true } : {}),
        };
    }

    return { defaults, info };
}

// The engine settings as the renderer shows them. Never throws for a master file that can't be used: the
// status says so instead.
export async function getView(): Promise<EngineSettingsView> {
    await initialized;
    const [masters, engine] = await Promise.all([
        readMasters(PROFILE_ID).catch((err) => {
            if (err instanceof UnusableSettingsFileError) {
                return { problem: err.message };
            }
            throw err;
        }),
        defaultEngineVars(),
    ]);
    const overrides: EngineSettingsView["overrides"] = {};
    if (!("problem" in masters)) {
        for (const [key, value] of Object.entries(effectiveOverrides(masters))) {
            const inDevice = Object.hasOwn(masters.device, key) && (isDeviceKey(key) || !Object.hasOwn(masters.synced, key));
            overrides[key] = { value, scope: inDevice ? "device" : "synced" };
        }
    }
    // A file that couldn't be used may have been fixed since, such as one the cloud had only half synced.
    if (!("problem" in masters) && !status.usable) {
        try {
            await readUsableSnapshot();
            setOutcome();
        } catch (err) {
            if (!(err instanceof UnusableSettingsFileError)) {
                throw err;
            }
        }
    }
    const viewStatus: EngineSettingsStatus = "problem" in masters ? { usable: false, problem: masters.problem } : status;

    return { status: viewStatus, overrides, clientDefaults: clientDefaults(), engineDefaults: engine.defaults, engineVars: engine.info };
}

async function changeSetting(change: (overrides: Overrides) => Overrides): Promise<void> {
    try {
        const changed = await changeMasters(PROFILE_ID, change);
        setOutcome();
        if (changed) {
            onChanged.dispatch();
        }
    } catch (err) {
        if (err instanceof UnusableSettingsFileError) {
            setOutcome(err);
        }
        throw err;
    }
}

/**
 * Sets one setting for the next launch. A value equal to the default beneath it, the client's or else the
 * engine's, removes the override instead, as the engine itself would. A game already running keeps what it
 * has; if it changes the same setting before it closes, its value wins.
 */
export async function setSetting(key: string, value: string): Promise<void> {
    checkSetting(key, value);
    const client = clientDefaults();
    const beneath = Object.hasOwn(client, key) ? client[key] : (await engineDefaults())[key];
    await changeSetting((overrides) => (value === beneath ? removeOverride(overrides, key) : setOverride(overrides, key, value)));
}

// Back to the default, for the next launch.
export async function resetSetting(key: string): Promise<void> {
    checkSetting(key);
    await changeSetting((overrides) => removeOverride(overrides, key));
}

export const engineConfig = { init, beginSession, getStatus, getView, setSetting, resetSetting, onChanged };
