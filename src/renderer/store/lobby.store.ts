// SPDX-FileCopyrightText: 2026 The BAR Lobby Authors
//
// SPDX-License-Identifier: MIT

import {
    LobbyListResetEventData,
    LobbyListUpdatedEventData,
    LobbyOverview,
    LobbyCreateRequestData,
    LobbyJoinRequestData,
    LobbyCreateOkResponseData,
    LobbyJoinOkResponseData,
    LobbyAddBotRequestData,
    LobbyRemoveBotRequestData,
    LobbyUpdateBotRequestData,
    LobbyUpdateRequestData,
    LobbyUpdatedEventData,
    LobbyLeftEventData,
    UserId,
} from "tachyon-protocol/types";
import { reactive } from "vue";
import { apply as applyPatch } from "json8-merge-patch";
import { notificationsApi } from "@renderer/api/notifications";
import { Lobby } from "@renderer/model/lobby";
import { setupI18n } from "@renderer/i18n";
import { subsManager } from "@renderer/store/users.store";
import { db } from "@renderer/store/db";
import { battleStore, battleActions } from "@renderer/store/battle.store";
import { router } from "@renderer/router";

const i18n = setupI18n();

const lobbySymbol = Symbol("lobby.store");

type LobbyId = string;

export const lobbyStore: {
    isInitialized: boolean;
    lobbies: Record<LobbyId, LobbyOverview>;
    isSubscribedToList: boolean;
    selectedLobby: LobbyOverview | null;
    activeLobby?: Lobby | null;
} = reactive({
    isInitialized: false,
    lobbies: {}, //This will hold changes from ``lobby/listUpdated`` events
    isSubscribedToList: false,
    selectedLobby: null,
    activeLobby: null,
});

export async function initLobbyStore() {
    window.tachyon.onEvent("lobby/listUpdated", onListUpdatedEvent);
    window.tachyon.onEvent("lobby/listReset", onLobbyListResetEvent);
    window.tachyon.onEvent("lobby/updated", onLobbyUpdatedEvent);
    window.tachyon.onEvent("lobby/left", onLobbyLeftEvent);
    lobbyStore.isInitialized = true;
}

function onListUpdatedEvent(data: LobbyListUpdatedEventData) {
    if (!lobbyStore.isSubscribedToList) return;
    console.log("Tachyon event: lobby/listUpdated:", data);
    lobbyStore.lobbies = applyPatch(lobbyStore.lobbies, data.lobbies);
    clearSelectedLobbyIfNull();
}

function onLobbyListResetEvent(data: LobbyListResetEventData) {
    if (!lobbyStore.isSubscribedToList) return;
    console.log("Tachyon event: lobby/listReset", data);
    lobbyStore.lobbies = data.lobbies;
    clearSelectedLobbyIfNull();
}

async function requestSubscribeList() {
    try {
        const response = await window.tachyon.request("lobby/subscribeList");
        //Per Tachyon protocol, this subscribes us, but does not return an updated list, that happens in the ListUpdated or ListReset events.
        console.log("subscribeList:", response.status);
        lobbyStore.isSubscribedToList = true;
    } catch (error) {
        console.error("Error with request lobby/subscribeList:", error);
        notificationsApi.alert({
            text: "Error with request lobby/subscribeList",
            severity: "error",
        });
        lobbyStore.isSubscribedToList = false;
        lobbyStore.lobbies = {};
    }
}

async function requestUnsubscribeList() {
    try {
        await window.tachyon.request("lobby/unsubscribeList");
        lobbyStore.isSubscribedToList = false;
        lobbyStore.lobbies = {};
    } catch (error) {
        console.error("Error with request lobby/unsubscribeList:", error);
        notificationsApi.alert({
            text: "Error with request lobby/subscribeList",
            severity: "error",
        });
    }
}

async function requestCreateLobby(data: LobbyCreateRequestData) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        const response = await window.tachyon.request("lobby/create", data);
        console.log("Tachyon: lobby/create:", response.status, response.data);
        lobbyStore.activeLobby = parseLobbyResponseData(response.data); //Set the active lobby data first...
        //battleStore.isLobbyOpened = true;
        router.push("/play/lobby");
        //Note, we don't do any 'user/subscribeUpdates' here because when we create it there is only ourselves on initial join.
        //If that ever changes, if a whole party joins instantly for example, then we need to revisit this.
    } catch (error) {
        console.error("Error with request lobby/create", error);
        notificationsApi.alert({
            text: "Error with request lobby/create",
            severity: "error",
        });
    }
}

async function requestJoinLobby(id: LobbyJoinRequestData) {
    try {
        battleActions.resetToDefaultBattle(undefined, undefined, undefined, true);
        const response = await window.tachyon.request("lobby/join", id);
        console.log("Tachyon: lobby/join:", response.status, response.data);
        lobbyStore.activeLobby = parseLobbyResponseData(response.data);
        //battleStore.isLobbyOpened = true;
        router.push("/play/lobby");

        const userSubList: UserId[] = [];
        for (const memberKey in lobbyStore.activeLobby.players) {
            userSubList.push(lobbyStore.activeLobby.players[memberKey].id);
        }
        for (const memberKey in lobbyStore.activeLobby.spectators) {
            userSubList.push(lobbyStore.activeLobby.spectators[memberKey].id);
        }
        subsManager.attach(userSubList, lobbySymbol);
    } catch (error) {
        console.error("Error with request lobby/join", error);
        notificationsApi.alert({
            text: "Error with request lobby/join",
            severity: "error",
        });
    }
}

async function requestJoinAllyTeam(allyTeam: string) {
    try {
        const response = await window.tachyon.request("lobby/joinAllyTeam", { allyTeam: allyTeam });
        console.log("Tachyon: lobby/joinAllyTeam", response);
    } catch (error) {
        console.error("Tachyon error: lobby/joinAllyTeam:", error);
        notificationsApi.alert({
            text: "Error with request lobby/joinAllyTeam",
            severity: "error",
        });
    }
}

async function requestJoinQueue() {
    try {
        const response = await window.tachyon.request("lobby/joinQueue");
        console.log("Tachyon: lobby/joinQueue:", response);
    } catch (error) {
        console.error("Tachyon error: lobby/joinQueue:", error);
        notificationsApi.alert({
            text: "Error with request lobby/joinQueue",
            severity: "error",
        });
    }
}

async function requestSpectate() {
    try {
        const response = await window.tachyon.request("lobby/spectate");
        console.log("Tachyon: lobby/spectate", response);
    } catch (error) {
        console.error("Tachyon error: lobby/spectate:", error);
        notificationsApi.alert({
            text: "Error with request lobby/spectate",
            severity: "error",
        });
    }
}

// Sorts the playerQueue based on the indices because we cannot assume they will be exclusively positive or consecutive integers
function sortPlayerQueue(map: Map<number, string>): Map<number, string> {
    const mapEntries = Array.from(map.entries());
    mapEntries.sort((a, b) => {
        const keyA = a[0];
        const keyB = b[0];
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
    });
    return new Map(mapEntries);
}

// We use this function to normalize both LobbyCreateOkResponseData and LobbyJoinOkResponseData into the Lobby type for use in the renderer
function parseLobbyResponseData(data: LobbyCreateOkResponseData | LobbyJoinOkResponseData) {
    //Do some cleanup in case there's old data in the stores.
    battleStore.battleOptions.mapOptions.customStartBoxes = [];

    //Set up a basic object to hold the data
    const lobbyObject: Lobby = {
        id: data.id,
        name: data.name,
        playerCount: 0, //Needs to be calculated below
        maxPlayerCount: 0, //Ditto
        spectatorCount: 0, //Ditto
        playerQueue: new Map(),
        botCount: 0,
        mapName: data.mapName,
        engineVersion: data.engineVersion,
        gameVersion: data.gameVersion,
        allyTeamConfig: {},
        players: {},
        spectators: {},
        bots: {},
    };
    battleStore.battleOptions.engineVersion = data.engineVersion;
    battleStore.battleOptions.gameVersion = data.gameVersion;
    db.maps.get(data.mapName).then((map) => {
        if (map == undefined) {
            console.error(`Error in parseLobbyResponseData(), ${data.mapName} is undefined in database.`);
            notificationsApi.alert({ text: `Error in lobby data, ${data.mapName} not found.`, severity: "error" });
        }
        battleStore.battleOptions.map = map;
    });
    for (const allyKey in data.allyTeamConfig) {
        const allyTeam = data.allyTeamConfig[allyKey];
        lobbyObject.allyTeamConfig[allyKey] = {
            startBox: allyTeam.startBox,
            maxTeams: allyTeam.maxTeams,
            teams: {},
        };
        for (const teamKey in allyTeam.teams) {
            const team = allyTeam.teams[teamKey];
            lobbyObject.allyTeamConfig[allyKey].teams![teamKey] = { maxPlayers: team.maxPlayers };
            lobbyObject.maxPlayerCount += team.maxPlayers; //Lobby maximum is sum of all AllyTeams>Teams>MaxPlayers
        }
        //Here we assign the startbox for the AllyTeam to the battlestore so they match what we set when the lobby was created.
        battleStore.battleOptions.mapOptions.customStartBoxes.push(allyTeam.startBox);
    }
    // We have to loop through anyway, so playerCount, spectatorCount, and botCount will be calculated by incrementing.
    for (const memberKey in data.players) {
        const member = data.players[memberKey];
        lobbyObject.playerCount++;
        lobbyObject.players![memberKey] = {
            id: member.id,
            allyTeam: member.allyTeam,
            team: member.team,
            player: member.player,
        };
    }
    const tempMap: Map<number, string> = new Map();
    for (const memberKey in data.spectators) {
        const member = data.spectators[memberKey];
        lobbyObject.spectatorCount++;
        lobbyObject.spectators[memberKey] = {
            id: member.id,
        };
        if (member.joinQueuePosition != null) {
            tempMap.set(member.joinQueuePosition, member.id);
        }
    }
    lobbyObject.playerQueue = new Map(sortPlayerQueue(tempMap));
    for (const botKey in data.bots) {
        const bot = data.bots[botKey];
        lobbyObject.botCount++;
        lobbyObject.bots![botKey] = {
            id: bot.id,
            hostUserId: bot.hostUserId,
            allyTeam: bot.allyTeam,
            team: bot.team,
            player: bot.player,
            name: bot.name ? bot.name : "Unknown",
            shortName: bot.shortName,
            version: bot.version ? bot.version : "",
            options: bot.options ? bot.options : {},
        };
    }
    if (data.currentBattle) {
        lobbyObject.currentBattle = data.currentBattle;
    }
    if (data.currentVote) {
        lobbyObject.currentVote = data.currentVote;
    }
    return lobbyObject;
}

async function requestLeaveLobby() {
    try {
        const response = await window.tachyon.request("lobby/leave");
        console.log("Tachyon: lobby/leave:", response.status);
    } catch (error) {
        console.error("Error with request lobby/leave", error);
        notificationsApi.alert({
            text: "Error with request lobby/leave",
            severity: "error",
        });
    }
    // If we ever use a specific view for a lobby instead of BattleDrawer, we need to push a route here
    clearUserSubscriptions();
    lobbyStore.activeLobby = undefined;
    //battleStore.isLobbyOpened = false;
}

// This is a *request* for the battle to start, but 'battle/start' event received will actually trigger the client to launch the game.
async function requestStartBattle() {
    try {
        const response = await window.tachyon.request("lobby/startBattle");
        console.log("Tachyon: lobby/startBattle:", response.status);
    } catch (error) {
        console.error("Error with request lobby/startBattle", error);
        notificationsApi.alert({
            text: "Error with request lobby/startBattle",
            severity: "error",
        });
    }
}

async function requestAddBot(data: LobbyAddBotRequestData) {
    try {
        const response = await window.tachyon.request("lobby/addBot", data);
        console.log("Tachyon lobby/addBot", response);
    } catch (error) {
        console.error("Error with request lobby/addBot", error);
        notificationsApi.alert({
            text: "Error with request lobby/addBot",
            severity: "error",
        });
    }
}

async function requestRemoveBot(data: LobbyRemoveBotRequestData) {
    try {
        const response = await window.tachyon.request("lobby/removeBot", data);
        console.log("Tachyon lobby/removeBot:", response);
    } catch (error) {
        console.error("Error with request lobby/removeBot", error);
        notificationsApi.alert({
            text: "Error with request lobby/removeBot",
            severity: "error",
        });
    }
}

async function requestUpdateBot(data: LobbyUpdateBotRequestData) {
    try {
        const response = await window.tachyon.request("lobby/updateBot", data);
        console.log("Tachyon lobby/updateBot:", response);
    } catch (error) {
        console.error("Error with request lobby/updateBot", error);
        notificationsApi.alert({
            text: "Error with request lobby/updateBot",
            severity: "error",
        });
    }
}

async function requestLobbyUpdate(data: LobbyUpdateRequestData) {
    try {
        const response = await window.tachyon.request("lobby/update", data);
        console.log("Tachyon lobby/update:", response);
    } catch (error) {
        console.error("Error with request lobby/update", error);
        notificationsApi.alert({ text: "Error with request lobby/update", severity: "error" });
    }
}

function clearSelectedLobbyIfNull() {
    if (lobbyStore.selectedLobby && lobbyStore.selectedLobby.id && lobbyStore.lobbies[lobbyStore.selectedLobby.id] == null) {
        lobbyStore.selectedLobby = null;
    }
}

async function onLobbyUpdatedEvent(data: LobbyUpdatedEventData) {
    console.log("Tachyon event: lobby/updated:", data);
    //Apply the patch
    lobbyStore.activeLobby = applyPatch(lobbyStore.activeLobby, data);
    if (!lobbyStore.activeLobby) return;
    if (data.mapName) {
        db.maps.get(data.mapName).then((map) => {
            if (map == undefined) {
                console.error(`Error in onLobbyUpdatedEvent(), ${data.mapName} is undefined in database.`);
                notificationsApi.alert({ text: `Error in lobby data, ${data.mapName} not found.`, severity: "error" });
            }
            battleStore.battleOptions.map = map;
        });
    }
    //Recalculate player counts afterward.
    let maxPlayerCount: number = 0;
    for (const allyKey in lobbyStore.activeLobby.allyTeamConfig) {
        for (const teamKey in lobbyStore.activeLobby.allyTeamConfig[allyKey].teams) {
            maxPlayerCount += lobbyStore.activeLobby.allyTeamConfig[allyKey].teams[teamKey].maxPlayers!;
        }
    }
    lobbyStore.activeLobby.maxPlayerCount = maxPlayerCount;
    const playerCount: number = Object.keys(lobbyStore.activeLobby.players).length;
    const spectatorCount: number = Object.keys(lobbyStore.activeLobby.spectators).length;
    const botCount: number = Object.keys(lobbyStore.activeLobby.bots).length;
    const tempMap: Map<number, string> = new Map();
    for (const memberKey in lobbyStore.activeLobby?.spectators) {
        const member = lobbyStore.activeLobby.spectators[memberKey];
        if (member.joinQueuePosition != null) {
            tempMap.set(member.joinQueuePosition, member.id);
        }
    }
    lobbyStore.activeLobby.playerQueue = new Map(sortPlayerQueue(tempMap));
    lobbyStore.activeLobby.playerCount = playerCount;
    lobbyStore.activeLobby.spectatorCount = spectatorCount;
    lobbyStore.activeLobby.botCount = botCount;
    const userAttachList: UserId[] = [];
    const userDetachList: UserId[] = [];
    if (data.players) {
        for (const memberKey in data.players) {
            const member = data.players[memberKey];
            if (member != null) {
                userAttachList.push(member.id);
            } else {
                userDetachList.push(memberKey);
            }
        }
    }
    if (data.spectators) {
        for (const memberKey in data.spectators) {
            const member = data.spectators[memberKey];
            if (member != null) {
                userAttachList.push(member.id);
            } else {
                userDetachList.push(memberKey);
            }
        }
    }
    if (userAttachList.length > 0) {
        subsManager.attach(userAttachList, lobbySymbol);
    }
    if (userDetachList.length > 0) {
        subsManager.detach(userDetachList, lobbySymbol);
    }
    console.log("activeLobby is:", lobbyStore.activeLobby);
}

function onLobbyLeftEvent(data: LobbyLeftEventData) {
    clearUserSubscriptions();
    lobbyStore.activeLobby = undefined;
    console.log("Tachyon event: lobby/left:", data);
    // If we ever use a specific view for a lobby instead of BattleDrawer, we need to push a route here
    //battleStore.isLobbyOpened = false;
    notificationsApi.alert({
        text: i18n.global.t("lobby.multiplayer.custom.removedFromLobby"),
        severity: "info",
    });
}

async function clearUserSubscriptions() {
    subsManager.clearAllFromList(lobbySymbol);
}

function clearLobbyAndListInfo() {
    lobbyStore.lobbies = {};
    lobbyStore.selectedLobby = null;
    lobbyStore.activeLobby = undefined;
    clearUserSubscriptions();
}

export const lobby = {
    requestSubscribeList,
    requestUnsubscribeList,
    requestCreateLobby,
    requestJoinLobby,
    requestLeaveLobby,
    requestStartBattle,
    clearLobbyAndListInfo,
    requestJoinAllyTeam,
    requestJoinQueue,
    requestSpectate,
    requestAddBot,
    requestRemoveBot,
    requestUpdateBot,
    requestLobbyUpdate,
};
