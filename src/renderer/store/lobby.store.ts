// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import {
    LobbyOverview,
} from "tachyon-protocol/types";
import { reactive } from "vue";

type LobbyId = string;

export const lobbyStore: {
    isInitialized: boolean;
    lobbies: Record<LobbyId, LobbyOverview>;
} = reactive({
    isInitialized: false,
    lobbies: {}, //This will hold changes from ``lobby/listUpdated`` events
});

export async function initLobbyStore() {
    lobbyStore.isInitialized = true;
    lobbyStore.lobbies = {
        "abac5e8b-72e2-4238-8cd0-5abf42df9dac": {
            id: "abac5e8b-72e2-4238-8cd0-5abf42df9dac",
            name: "hardcoded lobby",
            playerCount: 1,
            maxPlayerCount: 7,
            mapName: "Avalanche 3.4",
            engineVersion: "2025.04.04",
            gameVersion: "Beyond All Reason test-28379-33ba377",
            currentBattle: null
        }
    }
}
