// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { auth, me } from "@renderer/store/me.store";
import { SystemServerStatsOkResponseData } from "tachyon-protocol/types";
import { reactive } from "vue";
import { fetchAvailableQueues } from "@renderer/store/matchmaking.store";

export const tachyonStore = reactive({
    isInitialized: false,
    isConnected: false,
    serverStats: undefined,
    error: undefined,
} as {
    isInitialized: boolean;
    isConnected: boolean;
    serverStats?: SystemServerStatsOkResponseData;
    error?: string;
    fetchServerStatsInterval?: NodeJS.Timeout;
    reconnectInterval?: NodeJS.Timeout;
});

async function connect() {
    if (!me.isAuthenticated) throw new Error("Not authenticated");
    try {
        await window.tachyon.connect();
        tachyonStore.error = undefined;
    } catch (err) {
        console.error("Failed to connect to Tachyon server", err);
        tachyonStore.error = "Error";
        auth.logout();
        if (err instanceof Error) {
            throw new Error(err.message);
        } else {
            throw new Error(String(err));
        }
    }
}

async function fetchServerStats() {
    return window.tachyon.request("system/serverStats").then((response) => {
        if (response.status === "success") {
            tachyonStore.serverStats = response.data;
        } else {
            console.error("Failed to fetch server stats", response);
        }
    });
}

export async function initTachyonStore() {
    tachyonStore.isConnected = await window.tachyon.isConnected();
    if (tachyonStore.isConnected) {
        fetchServerStats();
        tachyonStore.fetchServerStatsInterval = setInterval(fetchServerStats, 60000);
    }
    console.debug(`Tachyon server is ${tachyonStore.isConnected ? "connected" : "disconnected"}`);

    window.tachyon.onConnected(() => {
        console.debug("Connected to Tachyon server");
        tachyonStore.isConnected = true;
        fetchServerStats();
        if (tachyonStore.fetchServerStatsInterval) {
            clearInterval(tachyonStore.fetchServerStatsInterval);
            tachyonStore.fetchServerStatsInterval = undefined;
        }
        if (tachyonStore.reconnectInterval) {
            clearInterval(tachyonStore.reconnectInterval);
            tachyonStore.reconnectInterval = undefined;
        }
        // Periodically fetch server stats
        tachyonStore.fetchServerStatsInterval = setInterval(fetchServerStats, 60000);

        // Fetch matchmaking queues when connected
        fetchAvailableQueues();
    });

    window.tachyon.onDisconnected(() => {
        console.debug("Disconnected from Tachyon server");
        tachyonStore.isConnected = false;
        if (tachyonStore.fetchServerStatsInterval) {
            clearInterval(tachyonStore.fetchServerStatsInterval);
            tachyonStore.fetchServerStatsInterval = undefined;
        }
        if (tachyonStore.reconnectInterval) {
            clearInterval(tachyonStore.reconnectInterval);
            tachyonStore.reconnectInterval = undefined;
        }
        // If the user is not in an offline session, try to reconnect
        if (me.isAuthenticated) {
            // Try to connect to Tachyon server periodically
            tachyonStore.reconnectInterval = setInterval(connect, 10000);
        }
    });

    window.tachyon.onBattleStart((springString) => {
        console.debug("Received battle start event", springString);
        const engineVersion = enginesStore.selectedEngineVersion;
        if (engineVersion === undefined) {
            console.error("No engine version selected");
            return;
        }
        if (!gameStore.selectedGameVersion) {
            console.error("No game version selected");
            return;
        }
        window.game.launchMultiplayer({
            engineVersion: engineVersion.id,
            gameVersion: gameStore.selectedGameVersion.gameVersion,
            springString,
        });
    });
    tachyonStore.isInitialized = true;
}

export const tachyon = { connect };
