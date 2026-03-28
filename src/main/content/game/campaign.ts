// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { MissionModel } from "@main/content/game/mission";

// TODO: use MissionDifficulty instead once missions are json too
export type CampaignDifficulty = {
    playerHandicap?: number;
    enemyHandicap?: number;
};

export type CampaignModel = {
    campaignId: string;
    title: string;
    description: string;

    // Paths to cached images:
    logo?: string | null;
    backgroundImage?: string | null;

    // Campaigns to complete for this one to unlock:
    prerequisites?: string[];
    // From state, not from campaign file:
    unlocked?: boolean;

    // Supported player counts:
    players: number[];

    // Difficulty names mapped to their handicap settings:
    difficulties: Record<string, CampaignDifficulty>;
    defaultDifficulty: string;

    // missionId → list of missionIds that must be completed first:
    unlocks?: Record<string, string[]>;

    // Runtime populated:
    missions?: Record<string, MissionModel>;
};
