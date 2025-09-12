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
import { router } from "@renderer/router";

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
    activeLobby?: Lobby;
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
        tachyonStore.activeLobby = parseLobbyResponseData(response.data);
        router.push("/play/customLobbies/lobby");
    } catch (error) {
        console.error("Error with request lobby/create", error);
        tachyonStore.error = "Error with request lobby/create";
    }
}

async function joinLobby(id: LobbyJoinRequestData) {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/join", id);
        tachyonStore.activeLobby = parseLobbyResponseData(response.data);
        router.push("/play/customLobbies/lobby");
    } catch (error) {
        console.error("Error with request lobby/join", error);
        tachyonStore.error = "Error with request lobby/join";
    }
}

// We use this function to normalize both LobbyCreateRequestData and LobbyJoinRequestData into the Lobby type for use in the renderer
function parseLobbyResponseData(data: LobbyCreateOkResponseData | LobbyJoinOkResponseData) {
    const lobbyObject: Lobby = {
        id: data.id,
		//FIXME: this can cause an error below because the Create response arrives before the lobby list update does!
        //name: tachyonStore.lobbyList[data.id].name,
        //playerCount: tachyonStore.lobbyList[data.id].playerCount,
        //maxPlayerCount: tachyonStore.lobbyList[data.id].maxPlayerCount,
		//Instead we just throw some temporary values. If all goes well, this will update immediately afterward. Maybe.
		name: "New Lobby",
		playerCount: 1,
		maxPlayerCount: 16,
        mapName: data.mapName,
        engineVersion: data.engineVersion,
        gameVersion: data.gameVersion,
        allyTeams: {},
        members: {},
    };
    for (const key in data.allyTeamConfig) {
        const item = data.allyTeamConfig[key];
        lobbyObject.allyTeams![key] = {
            startBox: {
                maxPlayersPerStartbox: 0,
                startboxes: [], //TODO: figure out a good way to convert the startbox format, or just completely ditch our current model in favor of what the server uses
            },
            maxTeams: item.maxTeams,
            teams: {},
        };
        for (const teamKey in item.teams) {
            const team = item.teams[teamKey];
            lobbyObject.allyTeams![key].teams![teamKey] = { maxPlayers: team.maxPlayers };
        }
    }
    for (const key in data.members) {
        const member = data.members[key];
        lobbyObject.members![key] = {
            userId: member.id,
            name: member.player, //TODO: waiting for confirmation that this is the player name field or not
            allyTeam: member.allyTeam,
            team: member.team,
            playerType: "player", //TODO: check if this should be self, friend, etc...
            rank: 0, //TODO: pull these next few from somewhere?
            countryCode: "BAR",
            roles: [],
            partyId: "",
        };
    }
    return lobbyObject;
}

async function leaveLobby() {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/leave");
        console.log("Tachyon: lobby/leave:", response.status);
		router.push("/play/customLobbies/customLobbies");
        tachyonStore.activeLobby = undefined;
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
        if (item.type == "added") {
            //This response contains "overview: LobbyOverview"
            const lobbyToAdd: Lobby = {
                id: item.overview.id,
                name: item.overview.name,
                mapName: item.overview.mapName,
                playerCount: item.overview.playerCount,
                maxPlayerCount: item.overview.maxPlayerCount,
                engineVersion: item.overview.engineVersion,
                gameVersion: item.overview.gameVersion,
            };
            if (item.overview.currentBattle !== undefined && item.overview.currentBattle?.startedAt !== undefined) {
                lobbyToAdd.currentBattle = { startedAt: item.overview.currentBattle.startedAt };
            }
            tachyonStore.lobbyList[lobbyToAdd.id] = lobbyToAdd;
			//We have to set these values here because they're not coming over in the protocol right now if we create the lobby.
			if ((tachyonStore.activeLobby !== undefined) && (item.overview.id == tachyonStore.activeLobby.id)) {
				tachyonStore.activeLobby.name = item.overview.name;
				tachyonStore.activeLobby.playerCount = item.overview.playerCount;
				tachyonStore.activeLobby.maxPlayerCount = item.overview.maxPlayerCount;
			}
        } else if (item.type == "removed") {
            //This response only contains the "id"
            delete tachyonStore.lobbyList[item.id];
        } else if (item.type == "updated") {
            //This response contains "overview: {}" with optional properties for everything except "id"
			let updateActiveLobby:boolean = false;
			if ((tachyonStore.activeLobby !== undefined) && (item.overview.id == tachyonStore.activeLobby.id)) {
				updateActiveLobby = true;
			}
            if (item.overview.name !== undefined) {
                tachyonStore.lobbyList[item.overview.id].name = item.overview.name;
				if (updateActiveLobby) { tachyonStore.activeLobby!.name = item.overview.name; }
            }
            if (item.overview.mapName !== undefined) {
                tachyonStore.lobbyList[item.overview.id].mapName = item.overview.mapName;
				if (updateActiveLobby) { tachyonStore.activeLobby!.mapName = item.overview.mapName; }
            }
            if (item.overview.playerCount !== undefined) {
                tachyonStore.lobbyList[item.overview.id].playerCount = item.overview.playerCount;
				if (updateActiveLobby) { tachyonStore.activeLobby!.playerCount = item.overview.playerCount; }
            }
            if (item.overview.maxPlayerCount !== undefined) {
                tachyonStore.lobbyList[item.overview.id].maxPlayerCount = item.overview.maxPlayerCount;
				if (updateActiveLobby) { tachyonStore.activeLobby!.maxPlayerCount = item.overview.maxPlayerCount; }
            }
            if (item.overview.engineVersion !== undefined) {
                tachyonStore.lobbyList[item.overview.id].engineVersion = item.overview.engineVersion;
				if (updateActiveLobby) { tachyonStore.activeLobby!.engineVersion = item.overview.engineVersion; }
            }
            if (item.overview.gameVersion !== undefined) {
                tachyonStore.lobbyList[item.overview.id].gameVersion = item.overview.gameVersion;
				if (updateActiveLobby) { tachyonStore.activeLobby!.gameVersion = item.overview.gameVersion; }
            }
            if (item.overview.currentBattle !== undefined && item.overview.currentBattle?.startedAt !== undefined) {
                tachyonStore.lobbyList[item.overview.id].currentBattle = { startedAt: item.overview.currentBattle?.startedAt };
				if (updateActiveLobby) { tachyonStore.activeLobby!.currentBattle = { startedAt: item.overview.currentBattle?.startedAt }; }
            }
        } else if (item.type == "setList") {
            //This response contains "overviews: LobbyOverview[]"
            item.overviews.forEach(function (overview, index) {
                const lobbyToAdd: Lobby = {
                    id: overview.id,
                    name: overview.name,
                    mapName: overview.mapName,
                    playerCount: overview.playerCount,
                    maxPlayerCount: overview.maxPlayerCount,
                    engineVersion: overview.engineVersion,
                    gameVersion: overview.gameVersion,
                };
                if (overview.currentBattle !== undefined && overview.currentBattle?.startedAt !== undefined) {
                    lobbyToAdd.currentBattle = { startedAt: overview.currentBattle.startedAt };
                }
                tachyonStore.lobbyList[lobbyToAdd.id] = lobbyToAdd;
            });
        } else {
            //If we reach this, the type of response does not match protocol
            console.error("onListUpdatedEvent: response type does not match protocol:", item);
        }
    });
}

function onLobbyUpdatedEvent(data: LobbyUpdatedEventData) {
    //TODO: update the tachyonStore.activeLobby with the new data here
    console.log("Tachyon event: lobby/updated:", data);
}

function onLobbyLeftEvent(data: LobbyLeftEventData) {
    tachyonStore.activeLobby = undefined;
    console.log("Tachyon event: lobby/left:", data);
    router.push("/play/customLobbies/customLobbies");
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
