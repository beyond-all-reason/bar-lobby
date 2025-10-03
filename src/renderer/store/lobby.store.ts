// SPDX-FileCopyrightText: 2025 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import { me } from "@renderer/store/me.store";
import {
    LobbyCreateOkResponseData,
    LobbyCreateRequestData,
    LobbyJoinOkResponseData,
    LobbyJoinRequestData,
    LobbyLeftEventData,
    LobbyListUpdatedEventData,
    LobbyUpdatedEventData,
    UserId,
    LobbyOverview,
    LobbyListResetEventData,
} from "tachyon-protocol/types";
import { reactive } from "vue";
import { Lobby } from "@renderer/model/lobby";
import { apply as applyPatch } from "json8-merge-patch";
import { battleStore, battleActions } from "@renderer/store/battle.store";
import { db } from "@renderer/store/db";
import { notificationsApi } from "@renderer/api/notifications";
import { setupI18n } from "@renderer/i18n";

const i18n = setupI18n();

export const lobbyStore = reactive({
    isInitialized: false,
    error: undefined,
    lobbyList: {}, //This will hold changes from ``lobby/listUpdated`` events
    selectedLobby: {}, //This is the lobby we select from the datatable showing the lobbylist
    activeLobby: undefined, //This will hold changes from ``lobby/updated`` events
} as {
    isInitialized: boolean;
    error?: string;
    lobbyList: Record<string, LobbyOverview>;
    selectedLobby: LobbyOverview | null;
    activeLobby?: Lobby;
});

async function subscribeList() {
    try {
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/subscribeList");
        //Per Tachyon protocol, this subscribes us, but does not return an updated list, that happens in the ListUpdated or ListReset events.
        console.log("subscribeList:", response.status);
    } catch (error) {
        console.error("Error with request lobby/subscribeList:", error);
        lobbyStore.error = "Error with request lobby/subscribeList";
        lobbyStore.lobbyList = {};
    }
}

async function unsubscribeList() {
    try {
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/unsubscribeList");
        console.log("Tachyon: lobby/unsubscribeList:", response.status);
    } catch (error) {
        console.error("Error with request lobby/unsubscribeList:", error);
        lobbyStore.error = "Error with request lobby/unsubscribeList";
    }
}

async function createLobby(data: LobbyCreateRequestData) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        battleStore.isOnline = true;
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/create", data);
        console.log("Tachyon: lobby/create:", response.status, response.data);
        lobbyStore.activeLobby = parseLobbyResponseData(response.data); //Set the active lobby data first...
        battleStore.isLobbyOpened = true;
        //Note, we don't do any 'user/subscribeUpdates' here because when we create it there is only ourselves on initial join.
        //If that ever changes, if a whole party joins instantly for example, then we need to revisit this.
    } catch (error) {
        console.error("Error with request lobby/create", error);
        lobbyStore.error = "Error with request lobby/create";
    }
}

async function joinLobby(id: LobbyJoinRequestData) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        battleStore.isOnline = true;
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/join", id);
        console.log("Tachyon: lobby/join:", response.status, response.data);
        lobbyStore.activeLobby = parseLobbyResponseData(response.data);
        battleStore.isLobbyOpened = true;
        //Subscribe to obtain user data
        const userSubList: UserId[] = [];
        for (const memberKey in lobbyStore.activeLobby.members) {
            if (lobbyStore.activeLobby.members[memberKey]) {
                userSubList.push(lobbyStore.activeLobby.members[memberKey].id);
            }
        }
        window.tachyon.request("user/subscribeUpdates", { userIds: userSubList });
    } catch (error) {
        console.error("Error with request lobby/join", error);
        lobbyStore.error = "Error with request lobby/join";
    }
}

// We use this function to normalize both LobbyCreateRequestData and LobbyJoinRequestData into the Lobby type for use in the renderer
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
        const allyTeam = data.allyTeamConfig[allyKey];
        lobbyObject.allyTeams![allyKey] = {
            startBox: allyTeam.startBox,
            maxTeams: allyTeam.maxTeams,
            teams: {},
        };
        for (const teamKey in allyTeam.teams) {
            const team = allyTeam.teams[teamKey];
            lobbyObject.allyTeams![allyKey].teams![teamKey] = { maxPlayers: team.maxPlayers };
            lobbyObject.maxPlayerCount += team.maxPlayers; //Lobby maximum is sum of all AllyTeams>Teams>MaxPlayers
        }
        //Here we assign the startbox for the AllyTeam to the battlestore so they match what we set when the lobby was created.
        battleStore.battleOptions.mapOptions.customStartBoxes.push(allyTeam.startBox);
    }
    //FIXME: Spectators need to be separated once implemented
    for (const memberKey in data.members) {
        lobbyObject.playerCount++; //Increment 1 for each player already in the lobby when created/joined.
        const member = data.members[memberKey];
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
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/leave");
        console.log("Tachyon: lobby/leave:", response.status);
    } catch (error) {
        console.error("Error with request lobby/leave", error);
        lobbyStore.error = "Error with request lobby/leave";
    }
    // If we ever use a specific view for a lobby instead of BattleDrawer, we need to push a route here
    clearUserSubscriptions();
    lobbyStore.activeLobby = undefined;
    battleStore.isLobbyOpened = false;
}

// This is a *request* for the battle to start, but 'battle/start' event received will actually trigger the client to launch the game.
async function requestStartBattle() {
    try {
        lobbyStore.error = undefined;
        const response = await window.tachyon.request("lobby/startBattle");
        console.log("Tachyon: lobby/startBattle:", response.status);
    } catch (error) {
        console.error("Error with request lobby/startBattle", error);
        lobbyStore.error = "Error with request lobby/startBattle";
    }
}

function clearSelectedLobbyIfNull() {
    if (lobbyStore.selectedLobby && lobbyStore.lobbyList[lobbyStore.selectedLobby.id] == null) {
        lobbyStore.selectedLobby = null;
    }
}

function onListUpdatedEvent(data: LobbyListUpdatedEventData) {
    console.log("Tachyon event: lobby/listUpdated:", data);
    lobbyStore.lobbyList = applyPatch(lobbyStore.lobbyList, data.lobbies);
    clearSelectedLobbyIfNull();
}

function onLobbyListResetEvent(data: LobbyListResetEventData) {
    lobbyStore.lobbyList = data.lobbies;
    clearSelectedLobbyIfNull();
}

function onLobbyUpdatedEvent(data: LobbyUpdatedEventData) {
    console.log("Tachyon event: lobby/updated:", data);
    //Apply the patch
    lobbyStore.activeLobby = applyPatch(lobbyStore.activeLobby, data);
    //Recalculate player counts afterward.
    let maxPlayerCount: number = 0;
    for (const allyKey in lobbyStore.activeLobby!.allyTeams) {
        for (const teamKey in lobbyStore.activeLobby!.allyTeams[allyKey]!.teams) {
            maxPlayerCount += lobbyStore.activeLobby!.allyTeams[allyKey]!.teams[teamKey]!.maxPlayers!;
        }
    }
    lobbyStore.activeLobby!.maxPlayerCount = maxPlayerCount;
    // TODO: Once spectator type is added, this will not work how we want it to (probably). We will likely have to iterate instead while checking type, queue, etc.
    const playerCount: number = Object.keys(lobbyStore.activeLobby!.members!).length;
    lobbyStore.activeLobby!.playerCount = playerCount;
    // We need to sub to new members, but if members go away we unsub instead. Ugh we need to maintain a list and diff it also lol
    if (data.members) {
        const userSubList: UserId[] = [];
        const userUnsubList: UserId[] = [];
        for (const memberKey in data.members) {
            const member = data.members[memberKey];
            if (member != null) {
                userSubList.push(member.id);
            } else {
                userUnsubList.push(memberKey);
            }
        }
        if (userSubList.length > 0) {
            window.tachyon.request("user/subscribeUpdates", { userIds: userSubList });
        }
        if (userUnsubList.length > 0) {
            window.tachyon.request("user/unsubscribeUpdates", { userIds: userUnsubList });
        }
    }
}

function onLobbyLeftEvent(data: LobbyLeftEventData) {
    clearUserSubscriptions();
    lobbyStore.activeLobby = undefined;
    console.log("Tachyon event: lobby/left:", data);
    // If we ever use a specific view for a lobby instead of BattleDrawer, we need to push a route here
    battleStore.isLobbyOpened = false;
    notificationsApi.alert({
        text: i18n.global.t("lobby.multiplayer.custom.removedFromLobby"),
        severity: "info",
    });
}

function clearUserSubscriptions() {
    const userUnsubList: UserId[] = [];
    if (lobbyStore.activeLobby?.members) {
        for (const memberKey in lobbyStore.activeLobby!.members) {
            if (lobbyStore.activeLobby!.members[memberKey]!.id != me.userId)
                // Skip unsubbing from ourselves.
                // TODO: avoid unsubbing from anyone we have subscribe to elsewhere (party, friends?)
                userUnsubList.push(lobbyStore.activeLobby!.members[memberKey]!.id);
        }
        if (userUnsubList.length > 0) {
            window.tachyon.request("user/unsubscribeUpdates", { userIds: userUnsubList });
        }
    }
}

function clearLobbyAndListInfo() {
    lobbyStore.lobbyList = {};
    lobbyStore.selectedLobby = null;
    lobbyStore.activeLobby = undefined;
}

export async function initLobbyStore() {
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

    lobbyStore.isInitialized = true;
}

export const lobby = { createLobby, joinLobby, leaveLobby, requestStartBattle, subscribeList, unsubscribeList, clearLobbyAndListInfo };
