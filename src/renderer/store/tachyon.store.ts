// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { me } from "@renderer/store/me.store";
import { SystemServerStatsOkResponseData } from "tachyon-protocol/types";
import { reactive } from "vue";
import { matchmakingStore, matchmaking } from "@renderer/store/matchmaking.store";
import { subsManager } from "@renderer/store/users.store";
import { UserId } from "tachyon-protocol/types";
import { notificationsApi } from "@renderer/api/notifications";
import { chat, chatStore } from "@renderer/store/chat.store";
import { setupI18n } from "@renderer/i18n";

const i18n = setupI18n();

export const tachyonStore = reactive({
    isInitialized: false,
    isConnected: false,
    wantsConnection: false,
    serverStats: undefined,
    error: undefined,
} as {
    isInitialized: boolean;
    isConnected: boolean;
    // Whether the user wants to be online, as opposed to whether they are. A
    // close while this is false is deliberate, so it isn't worth complaining
    // about and shouldn't be retried.
    wantsConnection: boolean;
    serverStats?: SystemServerStatsOkResponseData;
    error?: string;
    fetchServerStatsInterval?: NodeJS.Timeout;
    reconnectInterval?: NodeJS.Timeout;
});

async function connect() {
    if (!me.isAuthenticated) throw new Error("Not authenticated");

    tachyonStore.wantsConnection = true;
    try {
        await window.tachyon.connect();
        tachyonStore.error = undefined;
    } catch (err) {
        console.error("Failed to connect to Tachyon server", err);
        tachyonStore.error = "Error";
        if (err instanceof Error) {
            throw new Error(err.message);
        } else {
            throw new Error(String(err));
        }
    }
}

function stopReconnecting() {
    if (tachyonStore.reconnectInterval) {
        clearInterval(tachyonStore.reconnectInterval);
        tachyonStore.reconnectInterval = undefined;
    }
}

// Clearing the timer leaves any handshake already in flight running, which would
// connect after the user asked it to stop, so this has to reach the socket too.
// Dropping wantsConnection is what stops the close being treated as a fault.
async function cancelReconnect() {
    tachyonStore.wantsConnection = false;
    stopReconnecting();
    await window.tachyon.disconnect();
}

function stopFetchingServerStats() {
    if (tachyonStore.fetchServerStatsInterval) {
        clearInterval(tachyonStore.fetchServerStatsInterval);
        tachyonStore.fetchServerStatsInterval = undefined;
    }
}

function startReconnecting() {
    stopReconnecting();
    tachyonStore.reconnectInterval = setInterval(() => {
        // A tick can already be queued when the user cancels, and connect() would
        // set wantsConnection straight back to true.
        if (!me.isAuthenticated || !tachyonStore.wantsConnection) {
            stopReconnecting();
            return;
        }
        connect().catch(() => {
            // Already logged and surfaced via tachyonStore.error; keep retrying.
        });
    }, 10000);
}

async function fetchServerStats() {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("system/serverStats");
        tachyonStore.serverStats = response.data;
    } catch (error) {
        console.error("Error fetching server stats:", error);
        tachyonStore.error = "Error fetching server stats";
        tachyonStore.serverStats = undefined;
    }
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
        stopFetchingServerStats();
        stopReconnecting();
        // Periodically fetch server stats
        tachyonStore.fetchServerStatsInterval = setInterval(fetchServerStats, 60000);

        // Fetch matchmaking queues when connected
        if (matchmakingStore.isInitialized) {
            matchmaking.sendListRequest();
        }

        // Subscribe to messages (all sources) when connected
        if (chatStore.isInitialized) {
            chat.requestSubscribeReceived();
        }
    });

    window.tachyon.onDisconnected(() => {
        console.debug("Disconnected from Tachyon server");
        // Every failed reconnect attempt builds a socket that closes, so this fires again on each
        // retry. Only the first one is a real transition worth reacting to.
        const wasConnected = tachyonStore.isConnected;
        tachyonStore.isConnected = false;
        if (!wasConnected) return;

        stopFetchingServerStats();
        // A close the user asked for is not a fault, so it gets neither a warning
        // nor a retry. Anything else while they still want to be online does.
        if (me.isAuthenticated && tachyonStore.wantsConnection) {
            notificationsApi.alert({ text: i18n.global.t("lobby.navbar.serverStatus.connectionLost"), severity: "warning" });
            startReconnecting();
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

    subsManager.onNewUsersAttached.add(async (users: UserId[]) => {
        if (!tachyonStore.isConnected) return;

        try {
            const response = await window.tachyon.request("user/subscribeUpdates", { userIds: users });
            console.log("Tachyon: user/subscribeUpdates", response);
        } catch (error) {
            console.error("Tachyon error: 'user/subscribeUpdates'", error);
            notificationsApi.alert({ text: "Tachyon error with user/subscribeUpdates", severity: "error" });
        }
    });
    subsManager.onOldUsersDetached.add(async (users: UserId[]) => {
        // Dropping the connection detaches everything, and telling a server we
        // just lost that we're unsubscribing only produces an error for the user.
        if (!tachyonStore.isConnected) return;

        try {
            const response = await window.tachyon.request("user/unsubscribeUpdates", { userIds: users });
            console.log("Tachyon: user/unsubscribeUpdates", response);
        } catch (error) {
            console.error("Tachyon error: 'user/unsubscribeUpdates'", error);
            notificationsApi.alert({ text: "Tachyon error with user/unsubscribeUpdates", severity: "error" });
        }
    });

    tachyonStore.isInitialized = true;
}

// tachyonStore.reconnectInterval doubles as "are we still retrying", so a caller
// can show that and call cancelReconnect to give up.
export const tachyon = { connect, cancelReconnect };
