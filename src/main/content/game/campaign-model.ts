// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { CampaignDefinition } from "@main/content/game/generated/campaign";
import type { MissionModel } from "@main/content/game/mission";

/**
 * Campaign as returned to the lobby: extends the schema-validated {@link CampaignDefinition}
 * with local-cache paths for images and runtime-populated fields.
 *
 * Campaign JSON may declare `missions` as an ordered list of mission IDs; in the
 * lobby model this is replaced by a runtime missionId -> mission map.
 */
export type CampaignModel = Omit<CampaignDefinition, "missions"> & {
    /** Whether this campaign is currently unlocked (from app state, not from the campaign file). */
    unlocked?: boolean;
    /** Runtime-populated map of missionId to MissionModel. */
    missions: Record<string, MissionModel>;
};
