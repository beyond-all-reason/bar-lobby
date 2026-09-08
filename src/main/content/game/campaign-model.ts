// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { CampaignDefinition } from "@main/content/game/generated/campaign";
import type { MissionModel } from "@main/content/game/mission";

export type CampaignModel = Omit<CampaignDefinition, "missions" | "titleKey" | "descriptionKey"> & {
    title: string;
    description: string;
    unlocked?: boolean;
    missions: Record<string, MissionModel>;
};
