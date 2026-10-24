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
    saveError: undefined,
} as {
    content: SingleplayerContent | undefined;
    isLoading: boolean;
    loadError: string | undefined;
    // Saved progress, one save per campaign, scenario or tutorial played, keyed by saveKey. Main writes the
    // saves; this holds the latest copy of each.
    saves: Map<string, SingleplayerSave>;
    savesLoaded: boolean;
    // Why the last change to a save failed, cleared by the next one that succeeds.
    saveError: string | undefined;
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
    },
    saveStored(key: string, save: SingleplayerSave) {
        state.saves.set(key, save);
        state.saveError = undefined;
    },
    saveRemoved(key: string) {
        state.saves.delete(key);
        state.saveError = undefined;
    },
    saveFailed(message: string) {
        state.saveError = message;
    },
    clear() {
        state.content = undefined;
        state.isLoading = false;
        state.loadError = undefined;
        state.saves.clear();
        state.savesLoaded = false;
        state.saveError = undefined;
    },
};
