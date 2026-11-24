// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { reactive, readonly } from "vue";
import { SystemServerStatsOkResponseData } from "tachyon-protocol/types";

type ConnectionState = {
    isAuthenticated: boolean;
    isConnected: boolean;
    // Whether the user wants to be online, as opposed to whether they are. A
    // close while this is false is deliberate, so it isn't worth complaining
    // about and shouldn't be retried.
    wantsConnection: boolean;
    isReconnecting: boolean;
    serverStats?: SystemServerStatsOkResponseData;
    error?: string;
};

const state: ConnectionState = reactive({
    isAuthenticated: false,
    isConnected: false,
    wantsConnection: false,
    isReconnecting: false,
    serverStats: undefined,
    error: undefined,
});

export const connectionStore = readonly(state);

export const connectionActions = {
    set(changes: Partial<ConnectionState>) {
        Object.assign(state, changes);
    },
};
