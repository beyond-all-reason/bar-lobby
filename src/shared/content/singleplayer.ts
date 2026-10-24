// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

// What the singleplayer content loader hands the renderer. Main and the renderer both use these types, so
// nothing here may import from either.

import type { LanguageTables } from "./content-text";
import type { CampaignConfig } from "./schema/campaign-config";
import type { Compatibility } from "./schema/common";
import type { MissionConfig } from "./schema/mission-config";
import type { MissionManifest } from "./schema/mission-manifest";

/**
 * Where content was found. Official content ships as its own depot; custom content is whatever a player
 * puts in their own folder. More sources may be added, so group by the values that arrive rather than
 * assuming these two.
 */
export type ContentSource = "official" | "custom";

/**
 * One folder content is read from. `rootId` tells apart roots of the same source and stays the same
 * between runs, because saved progress is keyed by it.
 */
export type ContentRoot = { source: ContentSource; rootId: string; path: string };

export type SingleplayerKind = "campaign" | "scenario" | "tutorial";

// Ids are unique within one root only, so an item is named by all three.
export type SingleplayerItemRef = { source: ContentSource; rootId: string; id: string };

export type ContentProblem = { path: string; severity: "error" | "warning"; message: string };

export type MissionConfigs = {
    default: MissionConfig;
    // Keyed by number of human players, as in the manifest.
    numPlayers: Record<string, MissionConfig>;
};

// What a campaign mission, scenario and tutorial share: one folder with a manifest.
export type SingleplayerMission = {
    id: string;
    path: string;
    manifest: MissionManifest;
    configs: MissionConfigs;
    entryPointPath: string;
    language: LanguageTables;
    // The manifest's image and backgroundImage as bar:// URLs.
    imageUrl?: string;
    backgroundImageUrl?: string;
    // The folders to add to SpringData when launching, most specific last. Never a whole content root.
    springDataPaths: string[];
};

export type SingleplayerCampaign = SingleplayerItemRef & {
    kind: "campaign";
    path: string;
    config: CampaignConfig;
    credits: string[];
    // shared/language/, the fallback for every mission's own language/.
    language: LanguageTables;
    backgroundImageUrl?: string;
    logoUrl?: string;
    compatibility: Compatibility;
    // In the order the config lists them.
    missions: SingleplayerMission[];
};

export type SingleplayerScenario = SingleplayerItemRef &
    SingleplayerMission & {
        kind: "scenario" | "tutorial";
        compatibility: Compatibility;
    };

export type SingleplayerContent = {
    campaigns: SingleplayerCampaign[];
    scenarios: SingleplayerScenario[];
    tutorials: SingleplayerScenario[];
    problems: ContentProblem[];
};

export function isSameItem(a: SingleplayerItemRef, b: SingleplayerItemRef) {
    return a.source === b.source && a.rootId === b.rootId && a.id === b.id;
}
