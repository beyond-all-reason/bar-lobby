// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive, readonly } from "vue";
import type { MissionResult } from "@shared/content/campaign-progress";
import type { SingleplayerContent, SingleplayerItemRef, SingleplayerKind } from "@shared/content/singleplayer";

const state = reactive({
    content: undefined,
    isLoading: false,
    loadError: undefined,
    results: new Map(),
} as {
    content: SingleplayerContent | undefined;
    isLoading: boolean;
    loadError: string | undefined;
    // Played results in the order they happened, one list per campaign, scenario or tutorial. Held in memory
    // only for now, so a restart starts every item afresh.
    results: Map<string, MissionResult[]>;
});

export const singleplayerStore = readonly(state);

// Ids are unique within one root and one kind only, so a campaign and a tutorial can share an id.
export function resultsKey(kind: SingleplayerKind, { source, rootId, id }: SingleplayerItemRef) {
    return JSON.stringify([kind, source, rootId, id]);
}

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
    addResult(key: string, result: MissionResult) {
        state.results.set(key, [...(state.results.get(key) ?? []), result]);
    },
    clearResults(key: string) {
        state.results.delete(key);
    },
    clear() {
        state.content = undefined;
        state.isLoading = false;
        state.loadError = undefined;
        state.results.clear();
    },
};
