// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { singleplayerApi } from "@renderer/api/singleplayer";
import { resultsKey, singleplayerStore, singleplayerUpdates } from "@renderer/store/singleplayer.store";
import { CampaignState, evaluateCampaign, MissionOutcome, MissionResult } from "@shared/content/campaign-progress";
import type { ContentSource, SingleplayerCampaign, SingleplayerItemRef, SingleplayerKind } from "@shared/content/singleplayer";

// A scenario or tutorial, by what results are kept under.
type ItemRef = SingleplayerItemRef & { kind: "scenario" | "tutorial" };

// Rescans the content roots, so content added since the last load shows up. Results already recorded are kept.
async function loadContent() {
    singleplayerUpdates.loading();
    try {
        singleplayerUpdates.loaded(await singleplayerApi.list());
    } catch (error) {
        singleplayerUpdates.failed(error instanceof Error ? error.message : String(error));
    }
}

function results(kind: SingleplayerKind, ref: SingleplayerItemRef): readonly MissionResult[] {
    return singleplayerStore.results.get(resultsKey(kind, ref)) ?? [];
}

function campaignState(campaign: SingleplayerCampaign): CampaignState {
    return evaluateCampaign(campaign.config, results("campaign", campaign));
}

function campaignCompleted(campaign: SingleplayerCampaign) {
    return campaignState(campaign).finished;
}

// A scenario or tutorial is completed once it has been won.
function itemCompleted(item: ItemRef) {
    return results(item.kind, item).some((result) => result.outcome === "victory");
}

function tutorialsOf(source: ContentSource, rootId: string) {
    return (singleplayerStore.content?.tutorials ?? []).filter((tutorial) => tutorial.source === source && tutorial.rootId === rootId);
}

// The tutorials of one root count as one group, completed once every tutorial in it has been won.
function tutorialsCompleted(source: ContentSource, rootId: string) {
    const tutorials = tutorialsOf(source, rootId);

    return tutorials.length > 0 && tutorials.every(itemCompleted);
}

/**
 * Records the result of a played campaign mission. Whatever reports a finished game calls this, as do the
 * pass and fail buttons until missions can be launched. `finishedNow` is true when this result is the one
 * that finished the campaign.
 */
function recordCampaignResult(campaign: SingleplayerCampaign, missionId: string, outcome: MissionOutcome): { state: CampaignState; finishedNow: boolean } {
    const wasFinished = campaignCompleted(campaign);
    singleplayerUpdates.addResult(resultsKey("campaign", campaign), { missionId, outcome });
    const state = campaignState(campaign);

    return { state, finishedNow: state.finished && !wasFinished };
}

// Records the result of a played scenario or tutorial, the same way as recordCampaignResult.
function recordItemResult(item: ItemRef, outcome: MissionOutcome) {
    singleplayerUpdates.addResult(resultsKey(item.kind, item), { missionId: item.id, outcome });
}

function resetProgress(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    singleplayerUpdates.clearResults(resultsKey(kind, ref));
}

// Resets every tutorial in one root, which are shown and completed as one group.
function resetTutorials(source: ContentSource, rootId: string) {
    for (const tutorial of tutorialsOf(source, rootId)) {
        resetProgress("tutorial", tutorial);
    }
}

export const singleplayerLogic = {
    loadContent,
    results,
    campaignState,
    campaignCompleted,
    itemCompleted,
    tutorialsOf,
    tutorialsCompleted,
    recordCampaignResult,
    recordItemResult,
    resetProgress,
    resetTutorials,
};
