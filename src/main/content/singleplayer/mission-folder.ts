// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import fs from "node:fs/promises";
import path from "node:path";
import type { LanguageTables } from "../../../shared/content/content-text";
import type { Compatibility } from "../../../shared/content/schema/common";
import { LanguageFile } from "../../../shared/content/schema/language-file";
import { MissionConfig } from "../../../shared/content/schema/mission-config";
import { MissionManifest } from "../../../shared/content/schema/mission-manifest";
import type { MissionConfigs, SingleplayerMission } from "../../../shared/content/singleplayer";
import { fileInside, isHidden, readContentJson, toBarUrl } from "./files";
import type { Problems } from "./problems";

export const MANIFEST_FILE = "manifest.json";

// Every language/<locale>.json in a folder, keyed by locale. A folder without language/ has no text of its own.
export async function readLanguageFolder(folder: string, problems: Problems): Promise<LanguageTables> {
    const languageFolder = path.join(folder, "language");
    let names: string[];
    try {
        names = await fs.readdir(languageFolder);
    } catch {
        return {};
    }

    const tables: LanguageTables = {};
    for (const name of names.filter((n) => !isHidden(n) && n.endsWith(".json")).sort()) {
        const table = await readContentJson(path.join(languageFolder, name), LanguageFile, problems);
        if (table) {
            tables[name.slice(0, -".json".length)] = table;
        }
    }

    return tables;
}

// Listing an engine twice would leave which games go with it to whichever entry is read first.
export function checkCompatibility(compatibility: Compatibility, filePath: string, problems: Problems) {
    const seen = new Set<string>();
    for (const { engineVersion } of compatibility) {
        if (seen.has(engineVersion)) {
            problems.error(filePath, `compatibility lists engine ${engineVersion} more than once. Put all its games in one entry`);
        }
        seen.add(engineVersion);
    }
}

// The startscript is built from these names, so one that matches nothing would quietly drop a team or
// alliance from the game.
function checkTeams(config: MissionConfig, filePath: string, problems: Problems) {
    const alliances = new Set(Object.keys(config.alliances));
    const teams = new Set<string>();
    for (const [alliance, members] of Object.entries(config.alliances)) {
        for (const team of members) {
            if (teams.has(team)) {
                problems.error(filePath, `Team "${team}" is in more than one alliance, last seen in "${alliance}"`);
            }
            teams.add(team);
        }
    }

    const unknownTeam = (team: string, where: string) => {
        if (!teams.has(team)) {
            problems.error(filePath, `${where} names team "${team}", which is in no alliance`);
        }
    };
    const unknownAlliance = (alliance: string, where: string) => {
        if (!alliances.has(alliance)) {
            problems.error(filePath, `${where} names alliance "${alliance}", which is not in alliances`);
        }
    };

    config.playerTeam.forEach((team) => unknownTeam(team, "playerTeam"));
    Object.keys(config.teamSettings ?? {}).forEach((team) => unknownTeam(team, "teamSettings"));
    for (const [alliance, settings] of Object.entries(config.allianceSettings ?? {})) {
        unknownAlliance(alliance, "allianceSettings");
        if (settings.alliedWith !== undefined) {
            unknownAlliance(settings.alliedWith, `allianceSettings.${alliance}.alliedWith`);
        }
    }
}

async function readMissionConfig(folder: string, file: string, problems: Problems, manifestPath: string): Promise<MissionConfig | undefined> {
    const filePath = await fileInside(folder, file, problems, manifestPath, "Mission config");
    if (!filePath) {
        return undefined;
    }
    const config = await readContentJson(filePath, MissionConfig, problems);
    if (config) {
        checkTeams(config, filePath, problems);
    }

    return config;
}

export type MissionFolderOptions = {
    // Campaign missions take the campaign's compatibility; scenarios and tutorials declare their own.
    partOfCampaign: boolean;
    // Folders added to SpringData ahead of this one, such as the campaign's shared/.
    springDataPathsBefore: string[];
    // Where image and backgroundImage are looked up: the campaign's shared/media/ for a campaign mission,
    // the item's own media/ for a scenario or tutorial.
    mediaFolder: string;
};

/**
 * Reads one mission, scenario or tutorial folder. Gives undefined when it has an error, after reporting
 * every problem it can find rather than stopping at the first.
 */
export async function readMissionFolder(folder: string, options: MissionFolderOptions, problems: Problems): Promise<SingleplayerMission | undefined> {
    const id = path.basename(folder);
    const manifestPath = path.join(folder, MANIFEST_FILE);
    const manifest = await readContentJson(manifestPath, MissionManifest, problems);
    if (!manifest) {
        return undefined;
    }

    if (manifest.missionId !== id) {
        problems.error(manifestPath, `missionId "${manifest.missionId}" does not match its folder name "${id}"`);
    }
    if (options.partOfCampaign && manifest.compatibility) {
        problems.warning(manifestPath, "compatibility is ignored in a campaign mission. The campaign's compatibility applies to all its missions");
    } else if (!options.partOfCampaign) {
        if (manifest.compatibility) {
            checkCompatibility(manifest.compatibility, manifestPath, problems);
        } else {
            problems.error(manifestPath, "compatibility is required for a scenario or tutorial");
        }
    }

    const entryPointPath = await fileInside(folder, manifest.entryPoint, problems, manifestPath, "entryPoint");
    const defaultConfig = await readMissionConfig(folder, manifest.config.default, problems, manifestPath);
    const numPlayers: MissionConfigs["numPlayers"] = {};
    for (const [players, file] of Object.entries(manifest.config.numPlayers ?? {})) {
        const config = await readMissionConfig(folder, file, problems, manifestPath);
        if (config) {
            numPlayers[players] = config;
        }
    }
    const language = await readLanguageFolder(folder, problems);
    const mediaFile = (file: string | undefined, field: string) => (file === undefined ? undefined : fileInside(options.mediaFolder, file, problems, manifestPath, field));
    const imagePath = await mediaFile(manifest.image, "image");
    const backgroundImagePath = await mediaFile(manifest.backgroundImage, "backgroundImage");

    if (problems.hasErrors || !entryPointPath || !defaultConfig) {
        return undefined;
    }

    return {
        id,
        path: folder,
        manifest,
        configs: { default: defaultConfig, numPlayers },
        entryPointPath,
        language,
        imageUrl: imagePath && toBarUrl(imagePath),
        backgroundImageUrl: backgroundImagePath && toBarUrl(backgroundImagePath),
        springDataPaths: [...options.springDataPathsBefore, folder],
    };
}
