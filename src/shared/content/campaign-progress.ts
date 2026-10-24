// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { SavedResult, SaveVariableValue } from "./save";
import type { CampaignConfig } from "./schema/campaign-config";

export type MissionOutcome = "victory" | "failure";

// One played mission. The ordered list of these is what gets saved, never the state worked out from it,
// so a content update that changes the unlock graph applies to saves already written.
export type MissionResult = { missionId: string; outcome: MissionOutcome };

export type CampaignState = {
    // Missions the player can start now, in the order `missions` lists them.
    available: string[];
    // Missions won at least once, in the order `missions` lists them.
    completed: string[];
    // A final mission has been won.
    finished: boolean;
    // Missions a result took away after they had been unlocked, in the order `missions` lists them.
    removed: string[];
    // History entries for missions the campaign no longer has, in history order.
    ignored: MissionResult[];
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

/**
 * Works out where a player stands in a campaign by replaying their results against its unlock rules.
 *
 * A mission becomes available when it is a start mission, when a result unlocks it, or once every one of
 * its prerequisites has been won. A result's removals win over its own unlocks. A mission that has been
 * won is only offered again if it is replayable.
 */
export function evaluateCampaign(config: CampaignConfig, history: readonly MissionResult[]): CampaignState {
    const known = (id: string) => Object.hasOwn(config.missions, id);
    const unlocked = new Set(config.startMission.filter(known));
    const everUnlocked = new Set(unlocked);
    const completed = new Set<string>();
    const ignored: MissionResult[] = [];
    let finished = false;

    // Prerequisites unlock a mission once, when the last of them is won, the same as an unlock from a
    // result. A later removal therefore sticks instead of the prerequisites putting it straight back.
    const prerequisitesMet = new Set<string>();
    const unlockByPrerequisites = () => {
        for (const [id, mission] of Object.entries(config.missions)) {
            const prerequisites = mission.prerequisites ?? [];
            if (!prerequisitesMet.has(id) && prerequisites.length > 0 && prerequisites.every((p) => completed.has(p))) {
                prerequisitesMet.add(id);
                unlocked.add(id);
                everUnlocked.add(id);
            }
        }
    };

    for (const result of history) {
        const mission = config.missions[result.missionId];
        if (!known(result.missionId) || !mission) {
            ignored.push(result);
            continue;
        }

        if (result.outcome === "victory") {
            completed.add(result.missionId);
            if (config.finalMission.includes(result.missionId)) {
                finished = true;
            }
        }

        const unlocks = result.outcome === "victory" ? mission.victoryUnlocks : mission.failureUnlocks;
        const removes = result.outcome === "victory" ? mission.victoryRemoves : mission.failureRemoves;
        unlocks?.filter(known).forEach((id) => {
            unlocked.add(id);
            everUnlocked.add(id);
        });
        removes?.forEach((id) => unlocked.delete(id));

        unlockByPrerequisites();
    }

    const order = Object.keys(config.missions);

    return {
        available: order.filter((id) => unlocked.has(id) && (!completed.has(id) || isReplayable(config, id))),
        completed: order.filter((id) => completed.has(id)),
        finished,
        removed: order.filter((id) => everUnlocked.has(id) && !unlocked.has(id)),
        ignored,
    };
}

/**
 * The variables a campaign's missions have reported so far, which every mission of the campaign receives on
 * launch. Results apply in order, whether won or lost: each reported key replaces the one before, and null
 * deletes it. Results for missions the campaign no longer has still count, since variables belong to the
 * campaign rather than to its unlock graph.
 */
export function campaignVariables(history: readonly SavedResult[]): Record<string, SaveVariableValue> {
    const variables = new Map<string, SaveVariableValue>();
    for (const result of history) {
        for (const [key, value] of Object.entries(result.variables ?? {})) {
            if (value === null) {
                variables.delete(key);
            } else {
                variables.set(key, value);
            }
        }
    }

    return Object.fromEntries(variables);
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
