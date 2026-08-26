// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { AllyTeam, MissionDefinition, Team } from "@main/content/game/generated/mission";

/** Ally team as defined in `startScript.allyTeams` of a mission.json. */
export type AllyTeamModel = AllyTeam;

/** Team as defined in `startScript.allyTeams.<allyTeamName>.teams` of a mission.json. */
export type TeamModel = Team;

/** Everything needed to build the engine start script, as defined in a mission.json. */
export type MissionStartScript = MissionDefinition["startScript"];

/**
 * Difficulty selection used when building a mission start script.
 *
 * Mission/campaign JSON no longer define these fields, but the converter and
 * UI still accept an optional selected difficulty object.
 */
export type MissionDifficulty = {
    name: string;
    playerHandicap: number;
    enemyHandicap: number;
};

/**
 * Mission as returned to the lobby: extends the schema-validated {@link MissionDefinition}
 * with local-cache paths for images and runtime-populated fields.
 */
export type MissionModel = MissionDefinition & {
    /** Undefined for scenarios, which belong to no campaign. */
    campaignId?: string;
    /** Path to the mission's folder, relative to the root of the game archive. */
    missionFolder: string;
    /** Local cache path of the mission image, replacing the filename from the mission file. */
    image?: string;
    /** Whether this mission is currently unlocked (derived from the campaign's `unlocks` map, not from the mission file). */
    unlocked: boolean;
};
