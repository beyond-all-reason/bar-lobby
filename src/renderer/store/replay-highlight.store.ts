// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive, readonly } from "vue";

interface ReplayHighlightState {
    highlightedReplays: Set<string>;
}

const state = reactive<ReplayHighlightState>({
    highlightedReplays: new Set(),
});

export const replayHighlightStore = {
    state: readonly(state),

    setHighlightedReplays(fileNames: string[]) {
        state.highlightedReplays = new Set(fileNames);
    },

    acknowledgeReplay(fileName: string) {
        state.highlightedReplays.delete(fileName);
        // Force reactivity update
        state.highlightedReplays = new Set(state.highlightedReplays);
    },

    clearHighlights() {
        state.highlightedReplays.clear();
    },

    isHighlighted(fileName: string): boolean {
        return state.highlightedReplays.has(fileName);
    }
};
