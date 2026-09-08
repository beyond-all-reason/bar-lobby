// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { AllyTeam, MissionDefinition, Team } from "@main/content/game/generated/mission";

export type TeamModel = Omit<Team, "nameKey"> & {
    name: string;
};

export type AllyTeamModel = Omit<AllyTeam, "teams"> & {
    teams: Record<string, TeamModel>;
};

export type MissionStartScript = Omit<MissionDefinition["startScript"], "allyTeams"> & {
    allyTeams: Record<string, AllyTeamModel>;
};

export type MissionBriefing = {
    alliesPresent?: string[];
    objectives?: string[];
    knownHostiles?: string[];
    newUnits?: {
        unitDefName: string;
        description: string;
    }[];
};

export type MissionDifficulty = {
    name: string;
    playerHandicap: number;
    enemyHandicap: number;
};

export type MissionModel = Omit<MissionDefinition, "titleKey" | "descriptionKey" | "briefing" | "startScript"> & {
    title: string;
    description: string;
    briefing?: MissionBriefing;
    startScript: MissionStartScript;
    campaignId?: string;
    missionFolder: string;
    image?: string;
    unlocked: boolean;
};
