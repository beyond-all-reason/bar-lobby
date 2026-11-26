// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "node:path";
import type { ContentRef } from "@main/content/content-ref";
import { campaignVariables } from "@shared/content/campaign-progress";
import { matchingPairs } from "@shared/content/compatibility";
import { chosenDifficulty, type SaveVariableValue, type SingleplayerSave } from "@shared/content/save";
import { type Compatibility, DEV_COMPATIBILITY, type Difficulty } from "@shared/content/schema/common";
import type { MissionConfig } from "@shared/content/schema/mission-config";
import type { ChosenVersions, SingleplayerCampaign, SingleplayerLaunchFailure, SingleplayerMission, SingleplayerScenario } from "@shared/content/singleplayer";
import { SHARED_FOLDER } from "./campaign-folder";
import { missionLuaPath } from "./mission-archive";

export class LaunchFailureError extends Error {
    constructor(
        readonly reason: SingleplayerLaunchFailure,
        message: string
    ) {
        super(message);
    }
}

// What a launch can use from this install.
export type InstallState = {
    isPresent(ref: ContentRef): boolean;
    canAcquire(ref: ContentRef): boolean;
    installedEngines: readonly string[];
    installedGames: readonly string[];
    defaultEngine: string;
};

export type MissionLaunch = {
    engineVersion: string;
    // The base game the archive depends on, which the engine loads under the mutator.
    gameVersion: string;
    // The archive's name as the engine knows it: the start script's gametype.
    archiveName: string;
    archivePath: string;
    mapName: string;
    // Left out when the item ships the map: only installed or downloadable maps are for the content API.
    mapToEnsure?: string;
    // Added to the engine's data directories, after the assets: the archive's games/ and the maps the item ships.
    dataDirs: string[];
    entryPoint: string;
    config: MissionConfig;
    // The archive, where the game is one it doesn't depend on: launched as a copy that depends on the game instead.
    devCopyOf?: string;
};

export type LaunchTarget = { item: SingleplayerScenario; campaign?: undefined } | { item: SingleplayerMission; campaign: SingleplayerCampaign };

// The engine and game pairs this install can launch: anything the item accepts where both can be downloaded,
// and otherwise every installed engine with every installed game. The install's default pair is only what
// skirmish uses; content may name any other version the install ships.
function availablePairs(accepted: Compatibility, install: InstallState): Compatibility {
    if (install.canAcquire({ type: "engine", id: "" }) && install.canAcquire({ type: "game", id: "" })) {
        return accepted;
    }

    return install.installedEngines.map((engineVersion) => ({ engineVersion, gameVersions: [...install.installedGames] }));
}

type Pair = { engineVersion: string; gameVersion: string };

const obtainable = (install: InstallState, ref: ContentRef) => install.isPresent(ref) || install.canAcquire(ref);

// Content still in development: the default engine with the first game the archive depends on that this install has or can download.
function devPair(depend: readonly string[], install: InstallState): Pair | undefined {
    const gameVersion = depend.find((game) => obtainable(install, { type: "game", id: game }));

    return gameVersion ? { engineVersion: install.defaultEngine, gameVersion } : undefined;
}

// Dev mode's choice of engine or game, each of which must be one this install has or can download. What it
// leaves to choose is as the item would launch without one, or else as for content in development.
function withChosen(pair: Pair | undefined, chosen: ChosenVersions, depend: readonly string[], install: InstallState, name: string): Partial<Pair> {
    for (const [type, id] of [["engine", chosen.engineVersion] as const, ["game", chosen.gameVersion] as const]) {
        if (id !== undefined && !obtainable(install, { type, id })) {
            throw new LaunchFailureError("no_engine_and_game", `${name} was to launch with ${type} ${id}, which this install neither has nor can download`);
        }
    }
    const fallback = pair ?? devPair(depend, install);

    return { engineVersion: chosen.engineVersion ?? fallback?.engineVersion ?? install.defaultEngine, gameVersion: chosen.gameVersion ?? fallback?.gameVersion };
}

/**
 * How to launch one mission, or why it can't be, checked again here rather than taken from the renderer: the
 * archive, an engine with the game the archive depends on, and the map. An engine or game dev mode chose is
 * used whatever the item accepts, and a game the archive doesn't depend on launches a copy of it that does.
 */
export function planMissionLaunch({ item, campaign }: LaunchTarget, install: InstallState, chosen: ChosenVersions = {}): MissionLaunch {
    const owner = campaign ?? item;
    const name = campaign ? `campaign ${campaign.id} mission ${item.id}` : `${item.kind} ${item.id}`;
    if (!owner.archivePath || !owner.archiveName || !owner.archiveDepend) {
        throw new LaunchFailureError("no_archive", `${name} has no mission archive`);
    }

    const depend = owner.archiveDepend;
    const pair =
        owner.compatibility === DEV_COMPATIBILITY
            ? devPair(depend, install)
            : matchingPairs(owner.compatibility, availablePairs(owner.compatibility, install)).find(({ gameVersion }) => depend.includes(gameVersion));
    const isChosen = chosen.engineVersion !== undefined || chosen.gameVersion !== undefined;
    const { engineVersion, gameVersion } = (isChosen ? withChosen(pair, chosen, depend, install, name) : pair) ?? {};
    if (!engineVersion || !gameVersion) {
        throw new LaunchFailureError("no_engine_and_game", `${name} has no engine and game this install can launch it with. Its archive depends on ${depend.join(", ")}`);
    }

    const mapName = item.manifest.mapName;
    const shipped = [...item.maps, ...(campaign?.sharedMaps ?? [])].includes(mapName);
    const map: ContentRef = { type: "map", id: mapName };
    if (!shipped && !install.isPresent(map) && !install.canAcquire(map)) {
        throw new LaunchFailureError("map_unavailable", `${name} needs map "${mapName}", which is not installed`);
    }

    const config = item.configs.numPlayers["1"] ?? item.configs.default;
    const dataDirs = campaign ? [campaign.path, path.join(campaign.path, SHARED_FOLDER), item.path] : [item.path];

    return {
        engineVersion,
        gameVersion,
        archiveName: owner.archiveName,
        archivePath: owner.archivePath,
        mapName,
        mapToEnsure: shipped ? undefined : mapName,
        dataDirs,
        entryPoint: campaign ? missionLuaPath("campaign", campaign.id, item.id) : missionLuaPath(item.kind, item.id),
        config,
        ...(depend.includes(gameVersion) ? {} : { devCopyOf: owner.archivePath }),
    };
}

// What the Mission API is given besides the entry point.
export type MissionInputs = {
    difficulty: Difficulty;
    // Left out when there are none.
    variables?: Record<string, SaveVariableValue>;
};

/**
 * The difficulty the player chose, or the content's default, and for a campaign mission the variables its
 * missions have reported so far. A campaign mission is played at the campaign's difficulty. `save` is the
 * owner's, already checked to be one a result can be recorded in.
 */
export function missionInputs({ item, campaign }: LaunchTarget, save: SingleplayerSave | undefined): MissionInputs {
    const difficulty = chosenDifficulty(save, campaign ?? item);
    const variables = campaign && save ? campaignVariables(save) : {};

    return Object.keys(variables).length > 0 ? { difficulty, variables } : { difficulty };
}
