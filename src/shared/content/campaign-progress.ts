// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

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
    // History entries for missions the campaign no longer has, in history order.
    ignored: MissionResult[];
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
        unlocks?.filter(known).forEach((id) => unlocked.add(id));
        removes?.forEach((id) => unlocked.delete(id));

        unlockByPrerequisites();
    }

    const order = Object.keys(config.missions);

    return {
        available: order.filter((id) => unlocked.has(id) && (!completed.has(id) || isReplayable(config, id))),
        completed: order.filter((id) => completed.has(id)),
        finished,
        ignored,
    };
}
