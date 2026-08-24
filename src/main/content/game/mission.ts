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
 * Handicap settings of a single difficulty, as defined in a campaign.json or mission.json.
 */
export type DifficultySettings = NonNullable<MissionDefinition["difficulties"]>[string];

/**
 * A difficulty resolved for a mission, with its name attached and its handicaps defaulted.
 *
 * Missions and campaigns both store difficulties as a name-keyed map of optional handicaps;
 * this is the flattened form the UI and the start-script converter work with.
 */
export type MissionDifficulty = Required<DifficultySettings> & {
    name: string;
};

/**
 * Mission as returned to the lobby: extends the schema-validated {@link MissionDefinition}
 * with local-cache paths for images and runtime-populated fields.
 */
export type MissionModel = MissionDefinition & {
    /** Undefined for standalone missions, which belong to no campaign. */
    campaignId?: string;
    /** Path to the mission's folder, relative to the root of the game archive. */
    missionFolder: string;
    /** Local cache path of the mission image, replacing the filename from the mission file. */
    image?: string;
    /** Whether this mission is currently unlocked (derived from the campaign's `unlocks` map, not from the mission file). */
    unlocked: boolean;
};
