// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive, readonly } from "vue";
import { saveKey, type SingleplayerSave } from "@shared/content/save";
import type { SingleplayerContent } from "@shared/content/singleplayer";

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
    loadError: string | undefined;
    // Saved progress, one save per campaign, scenario or tutorial played, keyed by saveKey. Main writes the
    // saves; this holds the latest copy of each.
    saves: Map<string, SingleplayerSave>;
    savesLoaded: boolean;
    // Why the saves couldn't be read, which leaves every item's progress unknown until a load succeeds.
    savesLoadError: string | undefined;
    // Why the last change asked for to a save failed, keyed by saveKey, cleared by the next change to that
    // save that succeeds.
    saveErrors: Map<string, string>;
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
    failed(message: string) {
        state.loadError = message;
        state.isLoading = false;
    },
    savesLoaded(saves: readonly SingleplayerSave[]) {
        state.saves = new Map(saves.map((save) => [saveKey(save.item.kind, save.item), save]));
        state.savesLoaded = true;
        state.savesLoadError = undefined;
    },
    savesLoadFailed(message: string) {
        state.savesLoadError = message;
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
    saveFailed(key: string, message: string) {
        state.saveErrors.set(key, message);
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
