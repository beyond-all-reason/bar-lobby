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
    UserId,
    LobbyOverview,
    LobbyListResetEventData,
} from "tachyon-protocol/types";
import { reactive } from "vue";
import { fetchAvailableQueues } from "@renderer/store/matchmaking.store";
import { Lobby } from "@renderer/model/lobby";
import { router } from "@renderer/router";
import { apply as applyPatch } from "json8-merge-patch";
import { battleStore, battleActions } from "@renderer/store/battle.store";
import { db } from "@renderer/store/db";
import { notificationsApi } from "@renderer/api/notifications";

export const tachyonStore = reactive({
    isInitialized: false,
    isConnected: false,
    serverStats: undefined,
    error: undefined,
    lobbyList: {}, //This will hold changes from ``lobby/listUpdated`` events
    selectedLobby: {}, //This is the lobby we select from the datatable showing the lobbylist
    activeLobby: undefined, //This will hold changes from ``lobby/updated`` events
} as {
    isInitialized: boolean;
    isConnected: boolean;
    serverStats?: SystemServerStatsOkResponseData;
    error?: string;
    fetchServerStatsInterval?: NodeJS.Timeout;
    reconnectInterval?: NodeJS.Timeout;
    lobbyList: Record<string, LobbyOverview>;
    selectedLobby: Lobby | null;
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
        //Per Tachyon protocol, this subscribes us, but does not return an updated list, that happens in the ListUpdated or ListReset events.
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
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        battleStore.isOnline = true;
        battleStore.isLobbyOpened = true;
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/create", data);
        console.log("Tachyon: lobby/create:", response.status, response.data);
        tachyonStore.activeLobby = parseLobbyResponseData(response.data); //Set the active lobby data first...
        battleStore.isLobbyOpened = true;
        //Note, we don't do any 'user/subscribeUpdates' here because when we create it there is only ourselves on initial join.
        //If that ever changes, if a whole party joins instantly for example, then we need to revisit this.
    } catch (error) {
        console.error("Error with request lobby/create", error);
        tachyonStore.error = "Error with request lobby/create";
    }
}

async function joinLobby(id: LobbyJoinRequestData) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        battleStore.isOnline = true;
        tachyonStore.error = undefined;
        const response = await window.tachyon.request("lobby/join", id);
        console.log("Tachyon: lobby/join:", response.status, response.data);
        tachyonStore.activeLobby = parseLobbyResponseData(response.data);
        battleStore.isLobbyOpened = true;
        //Subscribe to obtain user data
        const userSubList: UserId[] = [];
        for (const memberKey in tachyonStore.activeLobby.members) {
            if (tachyonStore.activeLobby.members[memberKey]) {
                userSubList.push(tachyonStore.activeLobby.members[memberKey].id);
            }
        }
        window.tachyon.request("user/subscribeUpdates", { userIds: userSubList });
    } catch (error) {
        console.error("Error with request lobby/join", error);
        tachyonStore.error = "Error with request lobby/join";
    }
}

// We use this function to normalize both LobbyCreateRequestData and LobbyJoinRequestData into the LobbyOverview type for use in the renderer
function parseLobbyResponseData(data: LobbyCreateOkResponseData | LobbyJoinOkResponseData) {
    //Do some cleanup in case there's old data in the stores.
    battleStore.battleOptions.mapOptions.customStartBoxes = [];

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
    battleStore.battleOptions.engineVersion = data.engineVersion;
    battleStore.battleOptions.gameVersion = data.gameVersion;
    db.maps.get(data.mapName).then((map) => {
        battleStore.battleOptions.map = map;
    });
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
        //Here we assign the startbox for the AllyTeam to the battlestore so they match what we set when the lobby was created.
        battleStore.battleOptions.mapOptions.customStartBoxes.push(data.allyTeamConfig[allyKey].startBox);
    }
    //FIXME: Spectators need to be separated once implemented
    for (const memberKey in data.members) {
        lobbyObject.playerCount++; //Increment 1 for each player already in the lobby when created/joined.
        const member = data.members[memberKey];
        //TODO: after we parse this list we will want to go back and get actual player info for each using the ``user/subscribeUpdates`` request.
        lobbyObject.members![memberKey] = {
            id: member.id,
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
        clearUserSubscriptions();
        tachyonStore.activeLobby = undefined;
        battleStore.isLobbyOpened = false;
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

function checkSelectedLobbyForNull() {
    if (tachyonStore.selectedLobby && tachyonStore.lobbyList[tachyonStore.selectedLobby.id] == null) {
        tachyonStore.selectedLobby = null;
    }
}

function onListUpdatedEvent(data: LobbyListUpdatedEventData) {
    console.log("Tachyon event: lobby/listUpdated:", data);
    tachyonStore.lobbyList = applyPatch(tachyonStore.lobbyList, data.lobbies); //Error here until tachyon-protocol package updates
    checkSelectedLobbyForNull();
}

function onLobbyListResetEvent(data: LobbyListResetEventData) {
    tachyonStore.lobbyList = data.lobbies;
    checkSelectedLobbyForNull();
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
    // We need to sub to new members, but if members go away we unsub instead. Ugh we need to maintain a list and diff it also lol
    if (data.members) {
        const userSubList: UserId[] = [];
        for (const memberKey in data.members) {
            if (data.members[memberKey]) {
                userSubList.push(data.members[memberKey].id);
            }
        }
        if (userSubList.length > 0) {
            window.tachyon.request("user/subscribeUpdates", { userIds: userSubList });
        }
    }
}

function onLobbyLeftEvent(data: LobbyLeftEventData) {
    clearUserSubscriptions();
    tachyonStore.activeLobby = undefined;
    console.log("Tachyon event: lobby/left:", data);
    router.push("/play/customLobbies/customLobbies");
    battleStore.isLobbyOpened = false;
    //TODO: Probably want some kind of message displayed to the user, explaining they were removed from the lobby for reason [kicked | lobby crash | etc?]
    notificationsApi.alert({
        text: "You have been removed from the lobby.",
        severity: "info",
    });
}

function clearUserSubscriptions() {
    const userUnsubList: UserId[] = [];
    if (tachyonStore.activeLobby?.members) {
        for (const memberKey in tachyonStore.activeLobby!.members) {
            if (tachyonStore.activeLobby!.members[memberKey]!.id != me.userId)
                //Skip unsubbing from ourselves.
                userUnsubList.push(tachyonStore.activeLobby!.members[memberKey]!.id);
        }
        if (userUnsubList.length > 0) {
            window.tachyon.request("user/unsubscribeUpdates", { userIds: userUnsubList });
        }
    }
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
    window.tachyon.onEvent("lobby/listReset", (data) => {
        onLobbyListResetEvent(data);
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
