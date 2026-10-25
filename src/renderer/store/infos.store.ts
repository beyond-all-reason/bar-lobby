// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { Info } from "@main/services/info.service";
import { reactive, readonly } from "vue";

const state = reactive({
    isInitialized: false,
} as {
    isInitialized: boolean;
} & Info);

export const infosStore = readonly(state);

export const infosUpdates = {
    set(info: Info) {
        Object.assign(state, info);
        state.isInitialized = true;
    },
};
