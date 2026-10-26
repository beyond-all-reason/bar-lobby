// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { singleplayerApi } from "@renderer/api/singleplayer";
import { singleplayerStore, singleplayerUpdates } from "@renderer/store/singleplayer.store";
import { CampaignState, campaignState as stateOf, campaignVariables, hasWon, ItemProgress, MissionOutcome } from "@shared/content/campaign-progress";
import { ReportedResult, SaveCompatibility, saveCompatibility, saveKey, SaveVariables, SaveVariableValue } from "@shared/content/save";
import type { ContentSource, SingleplayerCampaign, SingleplayerItemRef, SingleplayerKind } from "@shared/content/singleplayer";

let isInitialized = false;

// Changes to the store's saves apply one at a time, in the order they arrive. A load holds back whatever
// arrives while it waits for main, so its copy of the saves can't overwrite a change made since.
let savesQueue: Promise<unknown> = Promise.resolve();

function inOrder<T>(task: () => T | Promise<T>): Promise<T> {
    const run = savesQueue.then(task);
    savesQueue = run.catch(() => {});

    return run;
}

// Keeps the store's saves current with every change main makes to them, not only the ones asked for here.
export function initSingleplayerLogic() {
    if (isInitialized) {
        return;
    }

    singleplayerApi.onSaveChanged(({ item, save }) => inOrder(() => singleplayerUpdates.saveChanged(saveKey(item.kind, item), save)));
    isInitialized = true;
}

// A scenario or tutorial, by what its save is kept under.
type ItemRef = SingleplayerItemRef & { kind: "scenario" | "tutorial" };

function messageOf(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

// Counts content loads, so only the latest one started sets the store's content; an earlier one that
// finishes after it would otherwise put back older content.
let latestLoad = 0;

// Rescans the content roots, so content added since the last load shows up. Saves are read the first time
// only: main writes every change to them, and the store already has each one it returned.
async function loadContent() {
    const load = ++latestLoad;
    singleplayerUpdates.loading();
    try {
        const [content] = await Promise.all([singleplayerApi.list(), singleplayerStore.savesLoaded ? undefined : loadSaves()]);
        if (load === latestLoad) {
            singleplayerUpdates.loaded(content);
        }
    } catch (error) {
        if (load === latestLoad) {
            singleplayerUpdates.failed(messageOf(error));
        }
    }
}

// A failure is kept apart from the content's own, so the content still shows, and is tried again next load.
function loadSaves() {
    return inOrder(async () => {
        // A load queued behind another that succeeded has nothing left to do.
        if (singleplayerStore.savesLoaded) {
            return;
        }
        try {
            singleplayerUpdates.savesLoaded((await singleplayerApi.getSaves()).saves);
        } catch (error) {
            singleplayerUpdates.saveFailed(messageOf(error));
        }
    });
}

const noProgress: ItemProgress = { plays: {} };

function saveOf(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    return singleplayerStore.saves.get(saveKey(kind, ref));
}

// Whether the campaign's save, if it has one, was started under the campaign's current saveVersion.
function campaignSaveCompatibility(campaign: SingleplayerCampaign): SaveCompatibility {
    const save = saveOf("campaign", campaign);

    return save ? saveCompatibility(save, campaign.config.saveVersion) : "compatible";
}

// A save from another save version counts as no progress until the player starts over.
function campaignProgress(campaign: SingleplayerCampaign): ItemProgress {
    return (campaignSaveCompatibility(campaign) === "compatible" && saveOf("campaign", campaign)) || noProgress;
}

function campaignState(campaign: SingleplayerCampaign): CampaignState {
    return stateOf(campaign.config, campaignProgress(campaign));
}

function campaignCompleted(campaign: SingleplayerCampaign) {
    return campaignState(campaign).finished;
}

// What the campaign's missions have reported so far, which each of its missions is launched with.
function variablesOf(campaign: SingleplayerCampaign): Record<string, SaveVariableValue> {
    return campaignVariables(campaignProgress(campaign));
}

// A scenario or tutorial is completed once it has been won.
function itemCompleted(item: ItemRef) {
    return hasWon((saveOf(item.kind, item) ?? noProgress).plays, item.id);
}

function tutorialsOf(source: ContentSource, rootId: string) {
    return (singleplayerStore.content?.tutorials ?? []).filter((tutorial) => tutorial.source === source && tutorial.rootId === rootId);
}

// The tutorials of one root count as one group, completed once every tutorial in it has been won.
function tutorialsCompleted(source: ContentSource, rootId: string) {
    const tutorials = tutorialsOf(source, rootId);

    return tutorials.length > 0 && tutorials.every(itemCompleted);
}

// Saves a result and keeps the save main wrote. Gives false, with the reason in the store, if it wasn't saved.
async function saveResult(kind: SingleplayerKind, ref: SingleplayerItemRef, result: ReportedResult) {
    try {
        const save = await singleplayerApi.recordResult(kind, ref, result);
        await inOrder(() => singleplayerUpdates.saveStored(saveKey(kind, ref), save));
        return true;
    } catch (error) {
        singleplayerUpdates.saveFailed(messageOf(error));
        return false;
    }
}

/**
 * Records the result of a played campaign mission, with the variables the mission reported. Whatever reports
 * a finished game calls this, as do the pass and fail buttons until missions can be launched. `finishedNow`
 * is true when this result is the one that finished the campaign. A result that couldn't be saved leaves the
 * state as it was.
 */
async function recordCampaignResult(campaign: SingleplayerCampaign, missionId: string, outcome: MissionOutcome, variables?: SaveVariables): Promise<{ state: CampaignState; finishedNow: boolean }> {
    const wasFinished = campaignCompleted(campaign);
    await saveResult("campaign", campaign, variables ? { missionId, outcome, variables } : { missionId, outcome });
    const state = campaignState(campaign);

    return { state, finishedNow: state.finished && !wasFinished };
}

// Records the result of a played scenario or tutorial, the same way as recordCampaignResult.
async function recordItemResult(item: ItemRef, outcome: MissionOutcome) {
    await saveResult(item.kind, item, { missionId: item.id, outcome });
}

async function deleteSave(kind: SingleplayerKind, ref: SingleplayerItemRef) {
    try {
        await singleplayerApi.deleteSave(kind, ref);
        await inOrder(() => singleplayerUpdates.saveRemoved(saveKey(kind, ref)));
    } catch (error) {
        singleplayerUpdates.saveFailed(messageOf(error));
    }
}

// Deletes the save of every tutorial in one root, which are shown and completed as one group.
async function deleteTutorialSaves(source: ContentSource, rootId: string) {
    for (const tutorial of tutorialsOf(source, rootId)) {
        await deleteSave("tutorial", tutorial);
    }
}

// Deletes every singleplayer save, for the settings menu. Gives false, with the reason in the store, if it
// failed part way; main has then reported each save it did delete.
async function deleteAllSaves() {
    try {
        await singleplayerApi.deleteAllSaves();
        await inOrder(() => singleplayerUpdates.allSavesDeleted());
        return true;
    } catch (error) {
        singleplayerUpdates.saveFailed(messageOf(error));
        return false;
    }
}

export const singleplayerLogic = {
    loadContent,
    campaignSaveCompatibility,
    campaignState,
    campaignCompleted,
    variablesOf,
    itemCompleted,
    tutorialsOf,
    tutorialsCompleted,
    recordCampaignResult,
    recordItemResult,
    deleteSave,
    deleteTutorialSaves,
    deleteAllSaves,
};
