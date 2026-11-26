// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import path from "node:path";
import { DEV_MISSION_ARCHIVE_PATH, ENGINE_SAVES_PATH, getContentRoots, SAVES_PATH, SUSPENDED_MISSIONS_PATH } from "@main/config/app";
import { getDefaultEngineVersion } from "@main/config/install-defaults";
import { contentAPI } from "@main/content/content-api";
import { InstallState, LaunchFailureError, LaunchTarget, missionInputs, planMissionLaunch } from "@main/content/singleplayer/mission-launch";
import { devArchiveCopy } from "@main/content/singleplayer/mission-archive";
import { missionStartScript, savedGameStartScript } from "@main/content/singleplayer/mission-script";
import * as suspended from "@main/content/singleplayer/suspended-missions";
import type { SuspendedChange, SuspendedMission, SuspendedMissionFile, SuspendedUnusable } from "@shared/content/suspended-mission";
import { gameAPI } from "@main/game/game";
import * as saves from "@main/content/singleplayer/saves";
import { SaveFailureError } from "@main/content/singleplayer/saves";
import { loadSingleplayerContent } from "@main/content/singleplayer/singleplayer-loader";
import { settingsService } from "@main/services/settings.service";
import { ipcMain } from "@main/typed-ipc";
import { logger } from "@main/utils/logger";
import { overIpc } from "@main/utils/over-ipc";
import { applyResult } from "@shared/content/campaign-progress";
import type { ReportedResult, SaveChange, SaveFailure, SingleplayerSaves } from "@shared/content/save";
import { Signal } from "$/jaz-ts-utils/signal";
import type { WebContents } from "electron";
import {
    ChosenVersions,
    ContentProblem,
    ContentRoot,
    ContentSource,
    isSameItem,
    SingleplayerContent,
    SingleplayerItemRef,
    SingleplayerKind,
    SingleplayerLaunchFailure,
    SingleplayerLoadFailure,
} from "@shared/content/singleplayer";

const log = logger("singleplayer.service.ts");

// Raised after every change to a save, whatever made it. Telling the renderer is one subscriber, so whatever
// shows saved progress stays current even when the change came from main, such as a finished game.
const onSaveChanged = new Signal<SaveChange>();
const onSuspendedChanged = new Signal<SuspendedChange>();

// Content is scanned when asked for, not watched: the depot only changes through Steam while the client is
// closed. Something that adds content while running can ask for a rescan through singleplayer:list.
let lastScan: Promise<SingleplayerContent> | undefined;

function logProblems(problems: readonly ContentProblem[]) {
    for (const problem of problems) {
        log[problem.severity === "error" ? "error" : "warn"](`${problem.path}: ${problem.message}`);
    }
}

// Dev mode is read on each scan, and the renderer rescans whenever it lists content, so turning it on or off
// shows or hides dev content the next time a list is opened.
function logLoaded(roots: readonly ContentRoot[], content: SingleplayerContent) {
    const count = (items: readonly SingleplayerItemRef[], root: ContentRoot) => items.filter((item) => item.source === root.source && item.rootId === root.rootId).length;
    for (const root of roots) {
        log.info(
            `Loaded singleplayer content from ${root.rootId} (${root.path}): ${count(content.campaigns, root)} campaigns, ${count(content.scenarios, root)} scenarios, ${count(content.tutorials, root)} tutorials`
        );
    }
    if (roots.length === 0) {
        log.info("No singleplayer content roots in this edition");
    }
    if (content.problems.length > 0) {
        log.warn(`${content.problems.length} singleplayer content problems, listed below`);
    }
}

function scan() {
    const roots = getContentRoots();
    lastScan = loadSingleplayerContent(roots, { devContent: settingsService.getSettings().devMode }).then((content) => {
        logLoaded(roots, content);
        logProblems(content.problems);
        return content;
    });

    return lastScan;
}

function scanned() {
    return lastScan ?? scan();
}

async function get<K extends "campaigns" | "scenarios" | "tutorials">(kind: K, ref: SingleplayerItemRef): Promise<SingleplayerContent[K][number] | undefined> {
    return (await scanned())[kind].find((item) => isSameItem(item, ref));
}

const itemOf = (kind: SingleplayerKind, { source, rootId, id }: SingleplayerItemRef) => ({ kind, source, rootId, id });

const KINDS = ["campaign", "scenario", "tutorial"] as const satisfies SingleplayerKind[];

// A save that can't be used says nothing reliable about whose it is, so it is matched to an item by the file
// that item's save would be kept in. One whose item isn't installed is only logged, as there is nothing to show it on.
async function getSaves(): Promise<SingleplayerSaves> {
    const [read, content] = await Promise.all([saves.readSaves(SAVES_PATH), scanned().catch(() => undefined)]);
    logProblems(read.problems);

    const unusableFiles = new Set(read.problems.map((problem) => path.basename(problem.path)));
    const unusable = KINDS.flatMap((kind) => (content?.[`${kind}s`] ?? []).filter((item) => unusableFiles.has(saves.saveFileName(kind, item))).map((item) => itemOf(kind, item)));

    return { saves: read.saves, unusable };
}

// Saved progress, for whatever reports a finished game.
function readSave(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    return saves.readSave(SAVES_PATH, kind, ref);
}

// The kind comes over IPC, so it is checked rather than trusted.
function checkKind(kind: string) {
    if (!(KINDS as readonly string[]).includes(kind)) {
        throw new SaveFailureError("unknown_item", `Unknown singleplayer kind ${JSON.stringify(kind)}. Expected one of ${KINDS.join(", ")}`);
    }
}

// A result applies under the item's rules as main last scanned them, not as the renderer has them.
async function recordResult(kind: SingleplayerKind, ref: SingleplayerItemRef, result: ReportedResult) {
    checkKind(kind);
    const item = await get(`${kind}s`, ref);
    if (!item) {
        throw new SaveFailureError("unknown_item", `No ${kind} ${ref.id} in ${ref.source}/${ref.rootId}`);
    }
    // A scenario or tutorial is one mission, and its plays are read under its own id.
    if (item.kind !== "campaign" && result.missionId !== item.id) {
        throw new SaveFailureError("invalid_result", `A result for ${kind} ${item.id} names mission ${result.missionId}`);
    }

    const save =
        item.kind === "campaign"
            ? await saves.recordResult(SAVES_PATH, kind, ref, result, item.config.saveVersion ?? 1, (progress, reported) => applyResult(item.config, progress, reported))
            : await saves.recordResult(SAVES_PATH, kind, ref, result);
    onSaveChanged.dispatch({ item: itemOf(kind, ref), save });
    // A game saved before this result no longer follows from the progress, so it can't be continued.
    await discardSuspended(kind, ref);

    return save;
}

// The difficulty comes over IPC, so it is checked against what the item offers rather than trusted.
async function setDifficulty(kind: SingleplayerKind, ref: SingleplayerItemRef, difficulty: string) {
    checkKind(kind);
    const item = await get(`${kind}s`, ref);
    if (!item) {
        throw new SaveFailureError("unknown_item", `No ${kind} ${ref.id} in ${ref.source}/${ref.rootId}`);
    }
    const offered = item.difficulties.find((offered) => offered === difficulty);
    if (!offered) {
        throw new SaveFailureError("invalid_difficulty", `${kind} ${item.id} does not offer difficulty ${JSON.stringify(difficulty)}. It offers ${item.difficulties.join(", ")}`);
    }

    const save = await saves.setDifficulty(SAVES_PATH, kind, ref, offered, item.kind === "campaign" ? (item.config.saveVersion ?? 1) : 1);
    onSaveChanged.dispatch({ item: itemOf(kind, ref), save });

    return save;
}

async function deleteSave(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    checkKind(kind);
    await saves.deleteSave(SAVES_PATH, kind, ref);
    onSaveChanged.dispatch({ item: itemOf(kind, ref), save: undefined });
    await discardSuspended(kind, ref);
}

// Every singleplayer save, for the settings menu. The player has confirmed it there.
async function deleteAllSaves() {
    await saves.deleteAllSaves(SAVES_PATH, (item) => onSaveChanged.dispatch({ item, save: undefined }));
    await suspended.deleteAllSuspendedMissions(SUSPENDED_MISSIONS_PATH, (item) => onSuspendedChanged.dispatch({ item, suspended: undefined }));
}

// The archive's hash, kept while its file is unchanged, so listing suspended missions doesn't read every archive each time.
const archiveHashes = new Map<string, { size: number; mtimeMs: number; sha256: Promise<string> }>();

async function archiveSha256(archivePath: string): Promise<string> {
    const { size, mtimeMs } = await fs.stat(archivePath);
    const cached = archiveHashes.get(archivePath);
    if (cached?.size === size && cached.mtimeMs === mtimeMs) {
        return cached.sha256;
    }
    const sha256 = suspended.sha256OfFile(archivePath);
    archiveHashes.set(archivePath, { size, mtimeMs, sha256 });
    sha256.catch(() => archiveHashes.delete(archivePath));

    return sha256;
}

// The campaign mission, scenario or tutorial a launch names, as main last scanned it.
async function targetOf(kind: SingleplayerKind, ref: SingleplayerItemRef, missionId: string | undefined): Promise<LaunchTarget | undefined> {
    const item = await get(`${kind}s`, ref);
    if (item?.kind === "campaign") {
        const mission = item.missions.find((mission) => mission.id === missionId);
        return mission && { item: mission, campaign: item };
    }

    return item && { item };
}

/**
 * Why a suspended mission can't be continued on this install, if it can't. The engine refuses only another
 * engine version; the game and the mission archive are the client's to check, as the engine would load a save
 * on them and break part way.
 */
async function suspendedUnusable(file: SuspendedMissionFile): Promise<SuspendedUnusable | undefined> {
    const target = await targetOf(file.item.kind, file.item, file.item.kind === "campaign" ? file.missionId : undefined);
    if (!target) {
        return "mission_unavailable";
    }
    if (!contentAPI.isPresent({ type: "engine", id: file.engineVersion })) {
        return "engine_unavailable";
    }
    if (!contentAPI.isPresent({ type: "game", id: file.gameVersion })) {
        return "game_unavailable";
    }
    const owner = target.campaign ?? target.item;
    if (!owner.archivePath || owner.archiveName !== file.archiveName || (await archiveSha256(owner.archivePath).catch(() => undefined)) !== file.archiveSha256) {
        return "archive_changed";
    }
    if ((target.campaign?.config.saveVersion ?? 1) !== (file.saveVersion ?? 1)) {
        return "save_version_changed";
    }

    return undefined;
}

async function forRendererSuspended(file: SuspendedMissionFile): Promise<SuspendedMission> {
    const unusable = await suspendedUnusable(file);

    return { item: itemOf(file.item.kind, file.item), missionId: file.missionId, savedAt: file.savedAt, ...(unusable ? { unusable } : {}) };
}

// Every suspended mission, each with whether it can be continued as the install is now.
async function getSuspendedMissions(): Promise<SuspendedMission[]> {
    const read = await suspended.readSuspendedMissions(SUSPENDED_MISSIONS_PATH);
    logProblems(read.problems);

    return Promise.all(read.files.map(forRendererSuspended));
}

async function discardSuspended(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    if (await suspended.deleteSuspendedMission(SUSPENDED_MISSIONS_PATH, kind, ref)) {
        log.info(`Discarded the suspended ${kind} ${ref.id}`);
        onSuspendedChanged.dispatch({ item: itemOf(kind, ref), suspended: undefined });
    }
}

// For the player to throw away one that can't be continued, or that they don't want.
async function deleteSuspended(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    checkKind(kind);
    await discardSuspended(kind, ref);
}

// Once the game has closed, keeps the save the player made in it, if they made one. Never throws: the game is over either way.
function adoptAfterGame(launch: suspended.MissionLaunchRecord) {
    return () => {
        void suspended
            .adoptEngineSave(ENGINE_SAVES_PATH, SUSPENDED_MISSIONS_PATH, launch)
            .then(async (file) => {
                if (file) {
                    onSuspendedChanged.dispatch({ item: file.item, suspended: await forRendererSuspended(file) });
                }
            })
            .catch((err) => log.error(`Keeping the save made in ${launch.item.kind} ${launch.item.id} failed: ${err instanceof Error ? err.message : String(err)}`));
    };
}

function installState(): InstallState {
    return {
        isPresent: (ref) => contentAPI.isPresent(ref),
        canAcquire: (ref) => contentAPI.canAcquire(ref),
        installedEngines: contentAPI.installed("engine").map((ref) => ref.id),
        installedGames: contentAPI.installed("game").map((ref) => ref.id),
        defaultEngine: getDefaultEngineVersion(),
    };
}

// The save a launched mission's result would go in, refused now if it couldn't take one.
async function saveForLaunch(kind: SingleplayerKind, ref: SingleplayerItemRef, saveVersion: number | undefined) {
    try {
        return await saves.readUsableSave(SAVES_PATH, kind, ref, saveVersion);
    } catch (err) {
        if (err instanceof SaveFailureError && (err.reason === "save_unusable" || err.reason === "save_version_older" || err.reason === "save_version_newer")) {
            throw new LaunchFailureError(err.reason, err.message);
        }
        throw err;
    }
}

// The versions come over IPC, so they are checked rather than trusted, and only dev mode may choose them.
function checkChosen(chosen: unknown): ChosenVersions {
    const { engineVersion, gameVersion } = (chosen ?? {}) as Record<string, unknown>;
    if (typeof (chosen ?? {}) !== "object" || [engineVersion, gameVersion].some((version) => version !== undefined && (typeof version !== "string" || version === ""))) {
        throw new LaunchFailureError("launch_failed", `Chosen versions must be an object of non-empty strings, not ${JSON.stringify(chosen)}`);
    }
    if ((engineVersion !== undefined || gameVersion !== undefined) && !settingsService.getSettings().devMode) {
        throw new LaunchFailureError("launch_failed", "Only dev mode can choose the engine and game a mission launches with");
    }

    return { engineVersion: engineVersion as string | undefined, gameVersion: gameVersion as string | undefined };
}

async function launchTarget(kind: SingleplayerKind, ref: SingleplayerItemRef, missionId: string | undefined): Promise<LaunchTarget> {
    if (!(KINDS as readonly string[]).includes(kind)) {
        throw new LaunchFailureError("unknown_item", `Unknown singleplayer kind ${JSON.stringify(kind)}`);
    }
    const target = await targetOf(kind, ref, missionId);
    if (!target) {
        throw new LaunchFailureError("unknown_item", `No ${kind} ${ref.id}${missionId ? ` mission ${missionId}` : ""} in ${ref.source}/${ref.rootId}`);
    }

    return target;
}

/**
 * Launches the item as main last scanned it, checking again what the renderer only showed, with the difficulty
 * and campaign variables from its save. No result is read back yet, so Pass and Fail still record one. Starting
 * from the start discards the item's suspended mission, which the renderer has the player confirm.
 */
async function launch(kind: SingleplayerKind, ref: SingleplayerItemRef, missionId: string | undefined, playerName: string, chosenVersions?: unknown) {
    const target = await launchTarget(kind, ref, missionId);
    const plan = planMissionLaunch(target, installState(), checkChosen(chosenVersions));
    const save = await saveForLaunch(kind, ref, target.campaign?.config.saveVersion);
    const inputs = missionInputs(target, save);
    const archiveName = plan.devCopyOf ? await devArchiveCopy(plan.devCopyOf, plan.gameVersion, DEV_MISSION_ARCHIVE_PATH) : plan.archiveName;
    const dataDirs = plan.devCopyOf ? [...plan.dataDirs, DEV_MISSION_ARCHIVE_PATH] : plan.dataDirs;
    const script = await missionStartScript({ archiveName, mapName: plan.mapName, config: plan.config, entryPoint: plan.entryPoint, inputs, playerName });
    const record: suspended.MissionLaunchRecord = {
        item: itemOf(kind, ref),
        missionId: target.item.id,
        entryPoint: plan.entryPoint,
        engineVersion: plan.engineVersion,
        gameVersion: plan.gameVersion,
        // A dev copy's name, so a game saved from one is unusable rather than continued on the original archive.
        archiveName,
        archiveSha256: await archiveSha256(plan.archivePath),
        saveVersion: target.campaign?.config.saveVersion,
        startedAt: Date.now(),
    };
    await discardSuspended(kind, ref);
    log.info(
        `Launching ${kind} ${ref.id}${missionId ? ` mission ${missionId}` : ""} as ${archiveName} on engine ${plan.engineVersion} with ${plan.gameVersion} at difficulty ${inputs.difficulty}, data directories ${dataDirs.join(", ")}`
    );
    await gameAPI.launchMission({
        engineVersion: plan.engineVersion,
        gameVersion: plan.gameVersion,
        mapSpringName: plan.mapToEnsure,
        script,
        dataDirs,
        onProcessClosed: adoptAfterGame(record),
    });
}

/**
 * Continues the item's suspended mission from where it was saved, on the engine and game it was played on. The
 * suspended mission is kept, so quitting without saving again leaves it to be continued from the same point;
 * saving again replaces it.
 */
async function continueMission(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    if (!(KINDS as readonly string[]).includes(kind)) {
        throw new LaunchFailureError("unknown_item", `Unknown singleplayer kind ${JSON.stringify(kind)}`);
    }
    const file = await suspended.readSuspendedMission(SUSPENDED_MISSIONS_PATH, kind, ref);
    if (!file) {
        throw new LaunchFailureError("suspended_missing", `${kind} ${ref.id} has no suspended mission`);
    }
    const unusable = await suspendedUnusable(file);
    if (unusable) {
        throw new LaunchFailureError("suspended_unusable", `The suspended ${kind} ${ref.id} mission ${file.missionId} can't be continued: ${unusable}`);
    }
    const target = await launchTarget(kind, ref, kind === "campaign" ? file.missionId : undefined);
    // Its result goes in the progress save, so that has to be able to take one, as for any launch.
    await saveForLaunch(kind, ref, target.campaign?.config.saveVersion);
    const plan = planMissionLaunch(target, installState());
    const savePath = suspended.suspendedSavePath(SUSPENDED_MISSIONS_PATH, kind, ref);
    const record: suspended.MissionLaunchRecord = {
        item: file.item,
        missionId: file.missionId,
        entryPoint: plan.entryPoint,
        engineVersion: file.engineVersion,
        gameVersion: file.gameVersion,
        archiveName: file.archiveName,
        archiveSha256: file.archiveSha256,
        saveVersion: file.saveVersion,
        startedAt: Date.now(),
    };
    log.info(`Continuing ${kind} ${ref.id} mission ${file.missionId}, saved ${file.savedAt}, on engine ${file.engineVersion} with ${file.gameVersion}, data directories ${plan.dataDirs.join(", ")}`);
    await gameAPI.launchMission({
        engineVersion: file.engineVersion,
        gameVersion: file.gameVersion,
        mapSpringName: plan.mapToEnsure,
        script: savedGameStartScript(savePath, file.playerName),
        dataDirs: plan.dataDirs,
        onProcessClosed: adoptAfterGame(record),
    });
}

const saveFailureOf = (err: unknown): SaveFailure => (err instanceof SaveFailureError ? err.reason : "save_failed");
const loadFailureOf = (): SingleplayerLoadFailure => "load_failed";
const launchFailureOf = (err: unknown): SingleplayerLaunchFailure => (err instanceof LaunchFailureError ? err.reason : "launch_failed");

// The start-script game name and depend are for launching and validating, which main does, so the renderer doesn't get them.
function forRenderer(content: SingleplayerContent): SingleplayerContent {
    const strip = <T extends { archiveName?: string; archiveDepend?: string[] }>(item: T): T => ({ ...item, archiveName: undefined, archiveDepend: undefined });

    return { ...content, campaigns: content.campaigns.map(strip), scenarios: content.scenarios.map(strip), tutorials: content.tutorials.map(strip) };
}

function registerIpcHandlers(webContents: WebContents) {
    ipcMain.handle("singleplayer:list", () => overIpc(() => scan().then(forRenderer), loadFailureOf));
    ipcMain.handle("singleplayer:getSaves", () => overIpc(getSaves, loadFailureOf));
    ipcMain.handle("singleplayer:recordResult", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string, result: ReportedResult) =>
        overIpc(() => recordResult(kind, { source, rootId, id }, result), saveFailureOf)
    );
    ipcMain.handle("singleplayer:setDifficulty", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string, difficulty: string) =>
        overIpc(() => setDifficulty(kind, { source, rootId, id }, difficulty), saveFailureOf)
    );
    ipcMain.handle("singleplayer:deleteSave", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string) => overIpc(() => deleteSave(kind, { source, rootId, id }), saveFailureOf));
    ipcMain.handle("singleplayer:deleteAllSaves", () => overIpc(deleteAllSaves, saveFailureOf));
    ipcMain.handle(
        "singleplayer:launch",
        (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string, missionId: string | undefined, playerName: string, chosenVersions: ChosenVersions) =>
            overIpc(() => launch(kind, { source, rootId, id }, missionId, playerName, chosenVersions), launchFailureOf)
    );
    ipcMain.handle("singleplayer:getSuspended", () => overIpc(getSuspendedMissions, loadFailureOf));
    ipcMain.handle("singleplayer:continueMission", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string) =>
        overIpc(() => continueMission(kind, { source, rootId, id }), launchFailureOf)
    );
    ipcMain.handle("singleplayer:deleteSuspended", (_, kind: SingleplayerKind, source: ContentSource, rootId: string, id: string) =>
        overIpc(() => deleteSuspended(kind, { source, rootId, id }), saveFailureOf)
    );

    onSaveChanged.add((change) => webContents.send("singleplayer:saveChanged", change));
    onSuspendedChanged.add((change) => webContents.send("singleplayer:suspendedChanged", change));
}

export const singleplayerService = {
    registerIpcHandlers,
    readSave,
    recordResult,
    onSaveChanged,
};
