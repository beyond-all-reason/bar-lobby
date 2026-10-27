// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import type { IpcResult } from "@main/typed-ipc";
import { singleplayerApi } from "@renderer/api/singleplayer";
import type { TranslationKey } from "@renderer/i18n";
import { singleplayerStore, singleplayerUpdates } from "@renderer/store/singleplayer.store";
import { CampaignState, campaignState as stateOf, campaignVariables, hasWon, ItemProgress, MissionOutcome } from "@shared/content/campaign-progress";
import { ReportedResult, SaveCompatibility, saveCompatibility, SaveFailure, saveKey, SaveVariables, SaveVariableValue } from "@shared/content/save";
import type { ContentSource, SingleplayerCampaign, SingleplayerItemRef, SingleplayerKind, SingleplayerLoadFailure } from "@shared/content/singleplayer";

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

// Keyed on every reason main can give for failing a load, so a new one does not compile until it has wording.
const contentLoadFailureKeys: Record<SingleplayerLoadFailure, TranslationKey> = {
    load_failed: "lobby.logic.singleplayer.contentLoadFailures.loadFailed",
};

const savesLoadFailureKeys: Record<SingleplayerLoadFailure, TranslationKey> = {
    load_failed: "lobby.logic.singleplayer.savesLoadFailures.loadFailed",
};

// Keyed on every reason main can give for not changing a save, so a new one does not compile until it has wording.
const saveFailureKeys: Record<SaveFailure, TranslationKey> = {
    save_unusable: "lobby.logic.singleplayer.saveFailures.saveUnusable",
    save_version_older: "lobby.logic.singleplayer.saveFailures.saveVersionOlder",
    save_version_newer: "lobby.logic.singleplayer.saveFailures.saveVersionNewer",
    invalid_result: "lobby.logic.singleplayer.saveFailures.invalidResult",
    unknown_item: "lobby.logic.singleplayer.saveFailures.unknownItem",
    save_failed: "lobby.logic.singleplayer.saveFailures.saveFailed",
};

// The data main gave, or the reason it gave for failing if it is one of `reasons`. Any other reason, or a call
// that never reached main, which ipcCall has logged, fails as `fallback`.
async function fromMain<T, R extends string>(call: () => Promise<IpcResult<T>>, reasons: Record<R, unknown>, fallback: R): Promise<{ data: T } | { reason: R }> {
    const result = await call().catch(() => undefined);
    if (result?.status === "success") {
        return { data: result.data };
    }

    return { reason: result && result.reason in reasons ? (result.reason as R) : fallback };
}

// Counts content loads, so only the latest one started sets the store's content; an earlier one that
// finishes after it would otherwise put back older content.
let latestLoad = 0;

// Rescans the content roots, so content added since the last load shows up. Saves are read the first time
// only: main writes every change to them, and the store already has each one it returned.
async function loadContent() {
    const load = ++latestLoad;
    singleplayerUpdates.loading();
    const [listed] = await Promise.all([fromMain(() => singleplayerApi.list(), contentLoadFailureKeys, "load_failed"), singleplayerStore.savesLoaded ? undefined : loadSaves()]);
    if (load !== latestLoad) {
        return;
    }
    if ("reason" in listed) {
        singleplayerUpdates.failed(listed.reason);
    } else {
        singleplayerUpdates.loaded(listed.data);
    }
}

// A failure is kept apart from the content's own, so the content still shows, and is tried again next load.
function loadSaves() {
    return inOrder(async () => {
        // A load queued behind another that succeeded has nothing left to do.
        if (singleplayerStore.savesLoaded) {
            return;
        }
        const read = await fromMain(() => singleplayerApi.getSaves(), savesLoadFailureKeys, "load_failed");
        if ("reason" in read) {
            singleplayerUpdates.savesLoadFailed(read.reason);
        } else {
            singleplayerUpdates.savesLoaded(read.data.saves);
        }
    });
}

// Why the last content load failed, if it did, as the message to show.
function loadErrorOf(): TranslationKey | undefined {
    return singleplayerStore.loadError && contentLoadFailureKeys[singleplayerStore.loadError];
}

// Why the saves couldn't be read, if they couldn't, as the message to show.
function savesLoadErrorOf(): TranslationKey | undefined {
    return singleplayerStore.savesLoadError && savesLoadFailureKeys[singleplayerStore.savesLoadError];
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

// Why the last change asked for to the item's save failed, if it did, as the message to show.
function saveErrorOf(kind: SingleplayerKind, ref: SingleplayerItemRef): TranslationKey | undefined {
    const reason = singleplayerStore.saveErrors.get(saveKey(kind, ref));

    return reason && saveFailureKeys[reason];
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
    const saved = await fromMain(() => singleplayerApi.recordResult(kind, ref, result), saveFailureKeys, "save_failed");
    if ("reason" in saved) {
        singleplayerUpdates.saveFailed(saveKey(kind, ref), saved.reason);
        return false;
    }
    await inOrder(() => singleplayerUpdates.saveStored(saveKey(kind, ref), saved.data));
    return true;
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
    const deleted = await fromMain(() => singleplayerApi.deleteSave(kind, ref), saveFailureKeys, "save_failed");
    if ("reason" in deleted) {
        singleplayerUpdates.saveFailed(saveKey(kind, ref), deleted.reason);
        return;
    }
    await inOrder(() => singleplayerUpdates.saveRemoved(saveKey(kind, ref)));
}

// Deletes the save of every tutorial in one root, which are shown and completed as one group.
async function deleteTutorialSaves(source: ContentSource, rootId: string) {
    for (const tutorial of tutorialsOf(source, rootId)) {
        await deleteSave("tutorial", tutorial);
    }
}

// Deletes every singleplayer save, for the settings menu. Gives the message to show if it failed part way;
// main has then reported each save it did delete.
async function deleteAllSaves(): Promise<TranslationKey | undefined> {
    const deleted = await fromMain(() => singleplayerApi.deleteAllSaves(), saveFailureKeys, "save_failed");
    if ("reason" in deleted) {
        return saveFailureKeys[deleted.reason];
    }
    await inOrder(() => singleplayerUpdates.allSavesDeleted());
    return undefined;
}

export const singleplayerLogic = {
    loadContent,
    loadErrorOf,
    savesLoadErrorOf,
    campaignSaveCompatibility,
    campaignState,
    campaignCompleted,
    variablesOf,
    itemCompleted,
    saveErrorOf,
    tutorialsOf,
    tutorialsCompleted,
    recordCampaignResult,
    recordItemResult,
    deleteSave,
    deleteTutorialSaves,
    deleteAllSaves,
};
