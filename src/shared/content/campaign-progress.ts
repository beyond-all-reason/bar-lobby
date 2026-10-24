// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { CampaignProgress, MissionPlays, ReportedResult, SaveVariableValue } from "./save";
import type { CampaignConfig } from "./schema/campaign-config";

export type MissionOutcome = "victory" | "failure";

type Plays = Readonly<Record<string, Readonly<MissionPlays>>>;

// What a save keeps of an item's progress: plays for every kind, and the campaign's own progress for a campaign.
// Read only, so a save straight from a readonly store can be passed in.
export type ItemProgress = {
    readonly plays: Plays;
    readonly campaign?: {
        readonly unlocked: readonly string[];
        readonly removed: readonly string[];
        readonly prerequisitesMet: readonly string[];
        readonly variables: Readonly<Record<string, SaveVariableValue>>;
    };
};

// An item's progress after a result, ready to be saved.
export type AppliedProgress = { plays: Record<string, MissionPlays>; campaign?: CampaignProgress };

export type CampaignState = {
    // Missions the player can start now, in the order `missions` lists them.
    available: string[];
    // Missions won at least once, in the order `missions` lists them.
    completed: string[];
    // A final mission has been won.
    finished: boolean;
    // Missions a result took away after they had been unlocked, in the order `missions` lists them.
    removed: string[];
};

// Where one mission stands, for showing it. Every flag is independent: a removed mission can still have been completed.
export type MissionStatus = {
    available: boolean;
    completed: boolean;
    replayable: boolean;
    removed: boolean;
    start: boolean;
    final: boolean;
};

export function isReplayable(config: CampaignConfig, missionId: string): boolean {
    return config.missions[missionId]?.settings?.replayable ?? config.settings?.replayableMissions ?? false;
}

export function hasWon(plays: Plays, missionId: string) {
    return (Object.hasOwn(plays, missionId) ? plays[missionId].victories : 0) > 0;
}

// Counts one play of a mission, scenario or tutorial.
export function countPlay(plays: Plays, missionId: string, outcome: MissionOutcome): Record<string, MissionPlays> {
    const counted = Object.hasOwn(plays, missionId) ? plays[missionId] : { victories: 0, failures: 0 };
    const updated = outcome === "victory" ? { ...counted, victories: counted.victories + 1 } : { ...counted, failures: counted.failures + 1 };

    return Object.fromEntries([...Object.entries(plays), [missionId, updated]]);
}

export function newCampaignProgress(config: CampaignConfig): CampaignProgress {
    return { unlocked: config.startMission.filter((id) => Object.hasOwn(config.missions, id)), removed: [], prerequisitesMet: [], variables: {} };
}

// The progress being changed, as sets, while one result or a reconcile is applied to it.
type Working = { unlocked: Set<string>; removed: Set<string>; prerequisitesMet: Set<string> };

function unlock(working: Working, id: string) {
    working.unlocked.add(id);
    working.removed.delete(id);
}

function remove(working: Working, id: string) {
    if (working.unlocked.delete(id)) {
        working.removed.add(id);
    }
}

// Prerequisites unlock a mission once, when the last of them is won, the same as an unlock from a result. A
// later removal therefore sticks instead of the prerequisites putting it straight back.
function unlockByPrerequisites(config: CampaignConfig, working: Working, plays: Plays) {
    for (const [id, mission] of Object.entries(config.missions)) {
        const prerequisites = mission.prerequisites ?? [];
        if (!working.prerequisitesMet.has(id) && prerequisites.length > 0 && prerequisites.every((p) => hasWon(plays, p))) {
            working.prerequisitesMet.add(id);
            unlock(working, id);
        }
    }
}

function working(config: CampaignConfig, progress: NonNullable<ItemProgress["campaign"]>): Working {
    const known = (id: string) => Object.hasOwn(config.missions, id);

    return {
        unlocked: new Set(progress.unlocked.filter(known)),
        removed: new Set(progress.removed.filter(known)),
        prerequisitesMet: new Set(progress.prerequisitesMet.filter(known)),
    };
}

function settled(config: CampaignConfig, working: Working, variables: Record<string, SaveVariableValue>): CampaignProgress {
    const order = Object.keys(config.missions);

    return {
        unlocked: order.filter((id) => working.unlocked.has(id)),
        removed: order.filter((id) => working.removed.has(id)),
        prerequisitesMet: order.filter((id) => working.prerequisitesMet.has(id)),
        variables,
    };
}

/**
 * Fits saved progress to the campaign as it is now. Missions the campaign no longer has are dropped, their
 * plays kept, and a mission whose prerequisites the player has already won is unlocked, which is how a mission
 * added by an update reaches players past it. Nothing a result unlocked or removed is changed.
 */
export function reconcileCampaign(config: CampaignConfig, progress: ItemProgress): CampaignProgress {
    const current = working(config, progress.campaign ?? newCampaignProgress(config));
    unlockByPrerequisites(config, current, progress.plays);

    return settled(config, current, { ...progress.campaign?.variables });
}

function mergeVariables(variables: Readonly<Record<string, SaveVariableValue>>, reported: ReportedResult["variables"]): Record<string, SaveVariableValue> {
    const merged = new Map(Object.entries(variables));
    for (const [key, value] of Object.entries(reported ?? {})) {
        if (value === null) {
            merged.delete(key);
        } else {
            merged.set(key, value);
        }
    }

    return Object.fromEntries(merged);
}

/**
 * Applies one played result to a campaign's progress, once, when it is reported. The result's unlock rules are
 * taken from the campaign as it is now, so a later change to them never rewrites this result's effect.
 *
 * The play is counted and the reported variables merged: each key replaces the one before, and null deletes
 * it. Then the outcome's unlocks and removals apply, a removal winning over the result's own unlock, and any
 * mission whose prerequisites are now all won is unlocked. Throws for a mission the campaign doesn't have.
 */
export function applyResult(config: CampaignConfig, progress: ItemProgress, result: ReportedResult): Required<AppliedProgress> {
    const mission = Object.hasOwn(config.missions, result.missionId) ? config.missions[result.missionId] : undefined;
    if (!mission) {
        throw new Error(`The campaign has no mission ${result.missionId}`);
    }

    const plays = countPlay(progress.plays, result.missionId, result.outcome);
    const current = working(config, reconcileCampaign(config, progress));
    const victory = result.outcome === "victory";
    (victory ? mission.victoryUnlocks : mission.failureUnlocks)?.filter((id) => Object.hasOwn(config.missions, id)).forEach((id) => unlock(current, id));
    (victory ? mission.victoryRemoves : mission.failureRemoves)?.forEach((id) => remove(current, id));
    unlockByPrerequisites(config, current, plays);

    return { plays, campaign: settled(config, current, mergeVariables(progress.campaign?.variables ?? {}, result.variables)) };
}

/**
 * Where a player stands in a campaign, for showing it. What can be played and whether the campaign is finished
 * follow the current config, so a change to which missions are replayable or final applies at once. A mission
 * that has been won is only offered again if it is replayable.
 */
export function campaignState(config: CampaignConfig, progress: ItemProgress): CampaignState {
    const current = reconcileCampaign(config, progress);
    const order = Object.keys(config.missions);
    const won = (id: string) => hasWon(progress.plays, id);

    return {
        available: current.unlocked.filter((id) => !won(id) || isReplayable(config, id)),
        completed: order.filter(won),
        finished: config.finalMission.some(won),
        removed: current.removed,
    };
}

// The variables a campaign's missions have reported so far, which every mission of the campaign receives on launch.
export function campaignVariables(progress: ItemProgress): Record<string, SaveVariableValue> {
    return { ...progress.campaign?.variables };
}

export function missionStatus(config: CampaignConfig, state: CampaignState, missionId: string): MissionStatus {
    return {
        available: state.available.includes(missionId),
        completed: state.completed.includes(missionId),
        replayable: isReplayable(config, missionId),
        removed: state.removed.includes(missionId),
        start: config.startMission.includes(missionId),
        final: config.finalMission.includes(missionId),
    };
}

// A scenario or tutorial has no unlock rules, so it can always be played, and played again.
export function itemStatus(completed: boolean): MissionStatus {
    return { available: true, completed, replayable: true, removed: false, start: false, final: false };
}
