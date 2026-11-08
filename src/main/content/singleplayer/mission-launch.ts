// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import path from "node:path";
import type { ContentRef } from "@main/content/content-ref";
import { matchingPairs } from "@shared/content/compatibility";
import { type Compatibility, DEV_COMPATIBILITY } from "@shared/content/schema/common";
import type { MissionConfig } from "@shared/content/schema/mission-config";
import type { SingleplayerCampaign, SingleplayerLaunchFailure, SingleplayerMission, SingleplayerScenario } from "@shared/content/singleplayer";
import type { InstallDefaults } from "@shared/install-defaults";
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
    installDefaults: InstallDefaults;
    defaultEngine: string;
};

export type MissionLaunch = {
    engineVersion: string;
    // The base game the archive depends on, which the engine loads under the mutator.
    gameVersion: string;
    // The archive's name as the engine knows it: the start script's gametype.
    archiveName: string;
    mapName: string;
    // Left out when the item ships the map: only installed or downloadable maps are for the content API.
    mapToEnsure?: string;
    // Added to the engine's data directories, after the assets: the archive's games/ and the maps the item ships.
    dataDirs: string[];
    entryPoint: string;
    config: MissionConfig;
};

export type LaunchTarget = { item: SingleplayerScenario; campaign?: undefined } | { item: SingleplayerMission; campaign: SingleplayerCampaign };

// The engine and game pairs this install can launch: anything the item accepts where both can be downloaded,
// the install's own pair when it names both, and otherwise every installed engine with every installed game.
function availablePairs(accepted: Compatibility, install: InstallState): Compatibility {
    if (install.canAcquire({ type: "engine", id: "" }) && install.canAcquire({ type: "game", id: "" })) {
        return accepted;
    }
    const { engine, game } = install.installDefaults;
    if (engine && game) {
        return [{ engineVersion: engine, gameVersions: [game] }];
    }

    return install.installedEngines.map((engineVersion) => ({ engineVersion, gameVersions: [...install.installedGames] }));
}

/**
 * How to launch one mission, or why it can't be, checked again here rather than taken from the renderer: the
 * archive, an engine with the game the archive depends on, and the map.
 */
export function planMissionLaunch({ item, campaign }: LaunchTarget, install: InstallState): MissionLaunch {
    const owner = campaign ?? item;
    const name = campaign ? `campaign ${campaign.id} mission ${item.id}` : `${item.kind} ${item.id}`;
    if (!owner.archivePath || !owner.archiveName || !owner.archiveDepend) {
        throw new LaunchFailureError("no_archive", `${name} has no mission archive`);
    }

    const depend = owner.archiveDepend;
    let pair: { engineVersion: string; gameVersion: string } | undefined;
    if (owner.compatibility === DEV_COMPATIBILITY) {
        const gameVersion = depend.find((game) => install.isPresent({ type: "game", id: game }) || install.canAcquire({ type: "game", id: game }));
        pair = gameVersion ? { engineVersion: install.defaultEngine, gameVersion } : undefined;
    } else {
        pair = matchingPairs(owner.compatibility, availablePairs(owner.compatibility, install)).find(({ gameVersion }) => depend.includes(gameVersion));
    }
    if (!pair) {
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
        ...pair,
        archiveName: owner.archiveName,
        mapName,
        mapToEnsure: shipped ? undefined : mapName,
        dataDirs,
        entryPoint: campaign ? missionLuaPath("campaign", campaign.id, item.id) : missionLuaPath(item.kind, item.id),
        config,
    };
}
