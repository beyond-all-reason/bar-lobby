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
    LobbyUpdatedEventData,
    SystemServerStatsOkResponseData,
} from "tachyon-protocol/types";
import { reactive } from "vue";
import { fetchAvailableQueues } from "@renderer/store/matchmaking.store";
import { Lobby } from "@renderer/model/lobby";
import { router } from "@renderer/router";
import { apply as applyPatch } from "json8-merge-patch";

export const tachyonStore = reactive({
    isInitialized: false,
    isConnected: false,
    serverStats: undefined,
    error: undefined,
    lobbyList: {}, //This will hold changes from ``lobby/listUpdated`` events
    activeLobby: undefined, //This will hold changes from ``lobby/updated`` events
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
        console.log("Tachyon: lobby/create:", response.status, response.data);
        tachyonStore.activeLobby = parseLobbyResponseData(response.data); //Set the active lobby data first...
        router.push("/play/customLobbies/lobby"); //...then move the user to the lobby view that uses the active lobby data
    } catch (error) {
        console.error("Error with request lobby/create", error);
        tachyonStore.error = "Error with request lobby/create";
    }
}

async function joinLobby(id: LobbyJoinRequestData) {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/join", id);
        console.log("Tachyon: lobby/join:", response.status, response.data);
        tachyonStore.activeLobby = parseLobbyResponseData(response.data);
        router.push("/play/customLobbies/lobby");
    } catch (error) {
        console.error("Error with request lobby/join", error);
        tachyonStore.error = "Error with request lobby/join";
    }
}

// We use this function to normalize both LobbyCreateRequestData and LobbyJoinRequestData into the Lobby type for use in the renderer
function parseLobbyResponseData(data: LobbyCreateOkResponseData | LobbyJoinOkResponseData) {
    //Set up a basic object to hold the data
    const lobbyObject: Lobby = {
        id: data.id,
        name: data.name,
        playerCount: 0, //Placeholder value; We can count this from the entries below in the team config
        maxPlayerCount: 0, //Placeholder value; Ditto for calculating max players
        mapName: data.mapName,
        engineVersion: data.engineVersion,
        gameVersion: data.gameVersion,
        allyTeams: {},
        members: {},
    };
    for (const allyKey in data.allyTeamConfig) {
        const item = data.allyTeamConfig[allyKey];
        lobbyObject.allyTeams![allyKey] = {
            startBox: data.allyTeamConfig[allyKey].startBox,
            maxTeams: item.maxTeams,
            teams: {},
        };
        for (const teamKey in item.teams) {
            const team = item.teams[teamKey];
            lobbyObject.allyTeams![allyKey].teams![teamKey] = { maxPlayers: team.maxPlayers };
            lobbyObject.maxPlayerCount += team.maxPlayers; //Lobby maximum is sum of all AllyTeams>Teams>MaxPlayers
        }
    }
    for (const memberKey in data.members) {
        lobbyObject.playerCount++; //Increment 1 for each player already in the lobby when created/joined.
        const member = data.members[memberKey];
        //TODO: after we parse this list we will want to go back and get actual player info for each using the ``user/subscribeUpdates`` request.
        lobbyObject.members![memberKey] = {
            id: member.id,
            //name: "Unknown Player", //Later we can update this from obtaining user information, along with other stuff
            allyTeam: member.allyTeam,
            team: member.team,
            player: member.player,
            type: "player",
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

// This send to the server to request the battle to start, but we have to wait for the 'battle/start' response to show up and respond to that.
async function startBattle() {
    try {
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/startBattle");
        console.log("Tachyon: lobby/startBattle:", response.status);
    } catch (error) {
        console.error("Error with request lobby/startBattle", error);
        tachyonStore.error = "Error with request lobby/startBattle";
    }
}

// This may change to become a JSON patch event, with a separate event for setList. If so, the lobbyList will need to be <LobbyOverview>s so we can parse it that way.
// It would not be a problem to change types, because we should never touch activeLobby from lobbyList data, or vice-versa.
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
            if (item.overview.currentBattle && item.overview.currentBattle?.startedAt) {
                lobbyToAdd.currentBattle = { startedAt: item.overview.currentBattle.startedAt };
            }
            tachyonStore.lobbyList[lobbyToAdd.id] = lobbyToAdd;
        } else if (item.type == "removed") {
            //This response only contains the "id"
            delete tachyonStore.lobbyList[item.id];
        } else if (item.type == "updated") {
            //This response contains "overview: {}" with optional properties for everything except "id"
            if (item.overview.name) {
                tachyonStore.lobbyList[item.overview.id].name = item.overview.name;
            }
            if (item.overview.mapName) {
                tachyonStore.lobbyList[item.overview.id].mapName = item.overview.mapName;
            }
            if (item.overview.playerCount) {
                tachyonStore.lobbyList[item.overview.id].playerCount = item.overview.playerCount;
            }
            if (item.overview.maxPlayerCount) {
                tachyonStore.lobbyList[item.overview.id].maxPlayerCount = item.overview.maxPlayerCount;
            }
            if (item.overview.engineVersion) {
                tachyonStore.lobbyList[item.overview.id].engineVersion = item.overview.engineVersion;
            }
            if (item.overview.gameVersion) {
                tachyonStore.lobbyList[item.overview.id].gameVersion = item.overview.gameVersion;
            }
            if (item.overview.currentBattle && item.overview.currentBattle?.startedAt) {
                tachyonStore.lobbyList[item.overview.id].currentBattle = { startedAt: item.overview.currentBattle?.startedAt };
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
                if (overview.currentBattle && overview.currentBattle?.startedAt) {
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
    console.log("Tachyon event: lobby/updated:", data);
    //Apply the patch
    tachyonStore.activeLobby = applyPatch(tachyonStore.activeLobby, data);
    //Recalculate player counts afterward.
    let maxPlayerCount: number = 0;
    for (const allyKey in tachyonStore.activeLobby!.allyTeams) {
        for (const teamKey in tachyonStore.activeLobby!.allyTeams[allyKey]!.teams) {
            maxPlayerCount += tachyonStore.activeLobby!.allyTeams[allyKey]!.teams[teamKey]!.maxPlayers!;
        }
    }
    tachyonStore.activeLobby!.maxPlayerCount = maxPlayerCount;
    let playerCount: number = 0;
    for (const members in tachyonStore.activeLobby!.members) {
        playerCount++;
    }
    tachyonStore.activeLobby!.playerCount = playerCount;
}

function onLobbyLeftEvent(data: LobbyLeftEventData) {
    tachyonStore.activeLobby = undefined;
    console.log("Tachyon event: lobby/left:", data);
    router.push("/play/customLobbies/customLobbies");
    //TODO: Probably want some kind of message displayed to the user, explaining they were removed from the lobby for reason [kicked | lobby crash | etc?]
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
