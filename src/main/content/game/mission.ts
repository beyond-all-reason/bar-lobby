// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

export type MissionDifficulty = {
    name: string;
    playerhandicap: number;
    enemyhandicap: number;
};

/** Mission-specific mod options, distinct from the multiplayer {@link ModOptions} in start-script.ts. */
export type MissionModOptions = {
    deathMode?: string;
    maxunits?: number;
    map_waterlevel?: number;
    startenergy?: number;
    startmetal?: number;
    ruins?: string;
};

export type MapOptions = {
    roads?: number;
    waterlevel?: number;
    waterdamage?: number;
};

export type TeamModel = {
    /** In-game display name for this team. */
    name?: string;
    Side?: string;
    StartPosX?: number;
    StartPosZ?: number;
    IncomeMultiplier?: number;
    /** AI short-name, or null/undefined when the slot is a human player. */
    ai?: string | null;
};

export type AllyTeamModel = {
    /** Only needed when startPosType is "chooseInGame". */
    startRectTop?: number;
    startRectLeft?: number;
    startRectBottom?: number;
    startRectRight?: number;
    /** Teams keyed by arbitrary custom team name defined in mission.lua. */
    teams: Record<string, TeamModel>;
};

// Fields sourced from LobbyData and StartScript tables in mission.lua.
// Triggers and Actions are intentionally ignored.
export type MissionModel = {
    // from context / LobbyData
    /** Undefined for standalone missions (e.g. future scenarios migrated to MissionModel). */
    campaignId?: string;
    missionId: string;
    /** Path to the mission.lua file, relative to the root of the game archive. */
    missionScriptPath: string;
    title: string;
    description: string;
    image: string | null; // cached local path
    startPos: { x: number; y: number };
    unlocked: boolean;
    // from StartScript
    mapName: string;
    startPosType: string;
    players: { min: number; max: number };
    /** Overrides the campaign-level difficulties when present. */
    difficulties?: MissionDifficulty[];
    defaultDifficulty?: string;
    /** Overrides the campaign-level disableFactionPicker when present. */
    disableFactionPicker?: boolean;
    /** Overrides the campaign-level disableInitialCommanderSpawn when present. */
    disableInitialCommanderSpawn?: boolean;
    modOptions: MissionModOptions;
    mapOptions: MapOptions;
    /** Unit def name → maximum allowed count. */
    unitLimits: Record<string, number>;
    /** Ally team name → AllyTeamModel. */
    allyTeams: Record<string, AllyTeamModel>;
};
