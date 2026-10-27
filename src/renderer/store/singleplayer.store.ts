// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive, readonly } from "vue";
import { saveKey, type SaveFailure, type SingleplayerSave } from "@shared/content/save";
import type { SingleplayerContent, SingleplayerLoadFailure } from "@shared/content/singleplayer";

const state = reactive({
    content: undefined,
    isLoading: false,
    loadError: undefined,
    saves: new Map(),
    savesLoaded: false,
    savesLoadError: undefined,
    saveErrors: new Map(),
} as {
    content: SingleplayerContent | undefined;
    isLoading: boolean;
    loadError: SingleplayerLoadFailure | undefined;
    // Saved progress, one save per campaign, scenario or tutorial played, keyed by saveKey. Main writes the
    // saves; this holds the latest copy of each.
    saves: Map<string, SingleplayerSave>;
    savesLoaded: boolean;
    // Why the saves couldn't be read, which leaves every item's progress unknown until a load succeeds.
    savesLoadError: SingleplayerLoadFailure | undefined;
    // Why the last change asked for to a save failed, keyed by saveKey, cleared by the next change to that
    // save that succeeds.
    saveErrors: Map<string, SaveFailure>;
});

export const singleplayerStore = readonly(state);

export const singleplayerUpdates = {
    loading() {
        state.isLoading = true;
        state.loadError = undefined;
    },
    loaded(content: SingleplayerContent) {
        state.content = content;
        state.isLoading = false;
    },
    failed(reason: SingleplayerLoadFailure) {
        state.loadError = reason;
        state.isLoading = false;
    },
    savesLoaded(saves: readonly SingleplayerSave[]) {
        state.saves = new Map(saves.map((save) => [saveKey(save.item.kind, save.item), save]));
        state.savesLoaded = true;
        state.savesLoadError = undefined;
    },
    savesLoadFailed(reason: SingleplayerLoadFailure) {
        state.savesLoadError = reason;
    },
    saveStored(key: string, save: SingleplayerSave) {
        state.saves.set(key, save);
        state.saveErrors.delete(key);
    },
    saveRemoved(key: string) {
        state.saves.delete(key);
        state.saveErrors.delete(key);
    },
    // A change reported by main, which may not be one this window asked for, so any error stays.
    saveChanged(key: string, save: SingleplayerSave | undefined) {
        if (save) {
            state.saves.set(key, save);
        } else {
            state.saves.delete(key);
        }
    },
    allSavesDeleted() {
        state.saves.clear();
        state.saveErrors.clear();
    },
    saveFailed(key: string, reason: SaveFailure) {
        state.saveErrors.set(key, reason);
    },
    clear() {
        state.content = undefined;
        state.isLoading = false;
        state.loadError = undefined;
        state.saves.clear();
        state.savesLoaded = false;
        state.savesLoadError = undefined;
        state.saveErrors.clear();
    },
};
