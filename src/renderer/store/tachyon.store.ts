// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { enginesStore } from "@renderer/store/engine.store";
import { gameStore } from "@renderer/store/game.store";
import { auth, me } from "@renderer/store/me.store";
import {
    LobbyCreateOkResponseData,
    LobbyCreateRequestData,
    LobbyJoinOkResponseData,
    LobbyJoinRequestData,
    LobbyLeftEventData,
    LobbyListUpdatedEventData,
    LobbyOverview,
    LobbyUpdatedEventData,
    SystemServerStatsOkResponseData,
} from "tachyon-protocol/types";
import { reactive } from "vue";
import { fetchAvailableQueues } from "@renderer/store/matchmaking.store";
import { Lobby } from "@renderer/model/lobby";

export const tachyonStore = reactive({
    isInitialized: false,
    isConnected: false,
    serverStats: undefined,
    error: undefined,
    lobbyList: {},
    activeLobby: undefined,
} as {
    isInitialized: boolean;
    isConnected: boolean;
    serverStats?: SystemServerStatsOkResponseData;
    error?: string;
    fetchServerStatsInterval?: NodeJS.Timeout;
    reconnectInterval?: NodeJS.Timeout;
    lobbyList: Record<string, Lobby>;
    activeLobby?: LobbyCreateOkResponseData | LobbyJoinOkResponseData;
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

async function subscribeList() {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/subscribeList");
        //Per Tachyon protocol, this subscribes us, but does not return an updated list, that happens in the ListUpdated event.
        console.log("subscribeList:", response.status);
    } catch (error) {
        console.error("Error with request lobby/subscribeList:", error);
        tachyonStore.error = "Error with request lobby/subscribeList";
        tachyonStore.lobbyList = {};
    }
}

async function unsubscribeList() {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/unsubscribeList");
        console.log("Tachyon: lobby/unsubscribeList:", response.status);
    } catch (error) {
        console.error("Error with request lobby/unsubscribeList:", error);
        tachyonStore.error = "Error with request lobby/unsubscribeList";
    }
}

async function createLobby(data: LobbyCreateRequestData) {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/create", data);
        tachyonStore.activeLobby = response.data;
		//TODO: Use the router to change to the lobby view
    } catch (error) {
        console.error("Error with request lobby/create", error);
        tachyonStore.error = "Error with request lobby/create";
    }
}

async function joinLobby(id: LobbyJoinRequestData) {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/join", id);
        tachyonStore.activeLobby = response.data;
        //TODO: Use the router to change to the lobby view
    } catch (error) {
        console.error("Error with request lobby/join", error);
        tachyonStore.error = "Error with request lobby/join";
    }
}

async function leaveLobby() {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/leave");
        console.log("Tachyon: lobby/leave:", response.status);
        tachyonStore.activeLobby = undefined;
        //TODO: Use the router to change back to the lobby list view
    } catch (error) {
        console.error("Error with request lobby/leave", error);
        tachyonStore.error = "Error with request lobby/leave";
    }
}

async function startBattle() {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/startBattle");
        console.log("Tachyon: lobby/startBattle:", response.status);
    } catch (error) {
        console.error("Error with request lobby/create", error);
        tachyonStore.error = "Error with request lobby/start";
    }
}

function onListUpdatedEvent(data: LobbyListUpdatedEventData) {
    console.log("Tachyon event: lobby/listUpdated:", data);
	data.updates.forEach(function (item, index) {
		if(item.type == "added") {
			const lobbyToAdd:Lobby = {
				id: item.overview.id,
				name: item.overview.name,
				mapName: item.overview.mapName,
				engineVersion: item.overview.engineVersion,
				gameVersion: item.overview.gameVersion,
			};
			tachyonStore.lobbyList[lobbyToAdd.id] = lobbyToAdd;
		}
		else if (item.type == "removed") {
			delete tachyonStore.lobbyList[item.id];
		}
		else if (item.type == "updated") {
			
			tachyonStore.lobbyList[item.overview.id] = item.overview.name //use ?: operators to set if exists on the overview.
			mapName: item.overview.mapName,
			engineVersion: item.overview.engineVersion,
			gameVersion: item.overview.gameVersion,
		}
		else { //type provided does not match protocol
			console.error("onListUpdatedEvent: updates.type does not match protocol for:", item);
		}
	});
}

function onLobbyUpdatedEvent(data: LobbyUpdatedEventData) {
    //TODO: update the tachyonStore.activeLobby with the new data here
    console.log("Tachyon event: lobby/updated:", data);
}

function onLobbyLeftEvent(data: LobbyLeftEventData) {
    //TODO: Use the router to change back to the lobby list view and update tachyonStoore.activeLobby
    tachyonStore.activeLobby = undefined;
    console.log("Tachyon event: lobby/left:", data);
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

    window.tachyon.onEvent("lobby/left", (data) => {
        onLobbyLeftEvent(data);
    });
    window.tachyon.onEvent("lobby/listUpdated", (data) => {
        onListUpdatedEvent(data);
    });
    window.tachyon.onEvent("lobby/updated", (data) => {
        onLobbyUpdatedEvent(data);
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

export const tachyon = { connect, createLobby, joinLobby, leaveLobby, startBattle, subscribeList, unsubscribeList };
