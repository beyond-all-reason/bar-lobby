// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive, readonly } from "vue";
import type { EngineSettingsFailure, EngineSettingsView } from "@shared/engine-settings/view";

const state = reactive({
    view: undefined,
    loadError: undefined,
    changeErrors: new Map(),
} as {
    // The latest settings main reported. Main keeps them; this is a copy.
    view: EngineSettingsView | undefined;
    loadError: EngineSettingsFailure | undefined;
    // Why the last change asked for to a setting failed, keyed by setting, cleared by the next one that succeeds.
    changeErrors: Map<string, EngineSettingsFailure>;
});

export const engineSettingsStore = readonly(state);

export const engineSettingsActions = {
    viewLoaded(view: EngineSettingsView) {
        state.view = view;
        state.loadError = undefined;
    },
    loadFailed(reason: EngineSettingsFailure) {
        state.loadError = reason;
    },
    changed(key: string, view: EngineSettingsView) {
        state.view = view;
        state.changeErrors.delete(key);
    },
    changeFailed(key: string, reason: EngineSettingsFailure) {
        state.changeErrors.set(key, reason);
    },
};
